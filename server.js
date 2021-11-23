// Dependencies
//express libreria mejorada para manejo de web requests
//http libreria para manejo de web requests
//socket.io libreria para el manejo de sockets
//url libreria para el manejo del url de request
//sqlite3 libreria para el manejo de base de datos
var express = require('express');
var http = require('http');
var socketIO = require('socket.io');
var url = require('url');
var sqlite3 = require('sqlite3').verbose();
var bodyParser = require('body-parser');

var app = express();				//inicia variable de aplicaciÃ³n express
var server = http.Server(app);		//crea un servidor http
var io = socketIO(server);			//crea un socket server

// Banderas de desarrollo
var islocal = false;									//indica si el juego es local o en glitch
var listen_port = islocal?82:process.env.PORT;		//puerto de listen: local_port_82 o glitch_port

//variables de administracion
var playeradmin = 0;
var n_fichas = 3;									//numero de fichas para cada jugador

app.set('port', listen_port);										//asigna a variable 'port' el valor del puerto
app.use('/static', express.static(__dirname + '/static'));			//habilita la carpeta static para hacerlo disponible al publico sus contenidos

// Routing
//Funcion para responder la solicitud inicial donde se extrae los valores de p y g del url del request. Luego se construye una pagina html
//donde se agrega un input hidden con el valor de p. Esa pagina html es repondida al usuario como el index.html.
app.get('/', function(request, response) {	
  response.sendFile(__dirname + "/index.html");
});

app.get("/players", (request, response) => {
	var playersdb = [];
    let db = new sqlite3.Database('treintayuno.db', sqlite3.OPEN_READONLY, (err) => {
		if (err) {
		console.error(err.message);
	}
	console.log('Connected db getplayersdb');
	});	
	
	db.serialize(() => {
		db.each("SELECT * FROM player", (err, row) => {
			if (err) {
				console.error(err.message);
			}
			playersdb.push([row.id,row.nombre]);
		});
	});

	db.close((err) => {
		if (err) {
			console.error(err.message);
		}
		console.log('Closed db getplayersdb');
		console.log(playersdb);
		response.json(playersdb);
	});	
});

// Starts the server.
//inicia el servidor para que escuche en el puerto asignado
const listener = server.listen(listen_port, function() {
  console.log('Starting server on port ' + listener.address().port);
});

// Variables globales para la informacion en db de los jugadores
var namejuga = {};									//array para almacenar los nombres de los jugadores en db
var ismanjuga = {};									//array para almacenar el genero de los jugadores en db
var dinerojuga = {};								//array para almacenar el dinero de los jugadores en db
cargasqlvariables();								//funcion que carga la informacion de la db en las variables

// Variables globales del juego
var juego = {};										//objeto que almacena todas las variables globales como propiedades
juego['estado'] = 0;								//el status del juego
juego['pozo'] = 0;									//el pozo
juego['puestos'] = [-1,-1,-1,-1,-1,-1,-1];			//array de las posiciones de jugadores con su id, el puesto se mantiene fi
juego['mesatapada'] = [];							//array que tiene las cartas que estan tapadas
juego['mesaabierta'] = [];							//array que tiene las cartas que estan abiertas
juego['quienbaraja'] = -1;							//id del jugador que le toca barajar
juego['turno'] = -1;								//id del jugador que le toca jugar
juego['ganador'] = -1;								//id del jugador que ha ganado
juego['perdedor'] = -1;								//id del jugador que ha perdido
juego['batatazo'] = false;							//indica si hubo batatazo
juego['is31'] = false;								//indica si hubo 31
juego['estadotxt'] = "Esperando al anfitri\u00F3n...";	//el texto que se muestra en la mesa

// Callback para atender cuando un usuario se conecta
io.on('connection', function(socket) {
	
	// Callback para atender mensaje 'new player'
	socket.on('new player', function(playerid) {
		console.log('player conectado: ' + playerid + ' en posicion: ' + juego['puestos'].some(estaenposicion));
		if(juego['estado'] != 0 && juego['estado'] != 1) return;	//rechaza si el jugador no esta en 0 o en 1
		if(juego['puestos'].some(estaenposicion)) return;			//rechaza si el jugador que se conecta ya tiene puesto
		function estaenposicion(value, index, array) {
		  return value == playerid;
		}		
		//cuando el jugador 0 inicia juego, el estado se cambia a 1 y se setea el estadotexto
		if(playerid == playeradmin) {	
			juego['estado'] = 1;
			juego['estadotxt'] = "Esperando a demas jugadores...";
		}
		//cuando el jugador se conecta por primera vez le asigna un puesto y sus datos
		ubicarpuesto(playerid);							//funcion que asigna al jugador un puesto
		juego[playerid] = {								//objeto (uno por jugador) con las variables de inicio del jugador
			fichas: 0,										//numero de fichas
			dinero: dinerojuga[playerid],					//dinero
			cartas: [],										//carta que tiene
			nombre: namejuga[playerid],						//su nombre
			isman: ismanjuga[playerid],						//es hombre o mujer
			bajado: false,									//si ya se bajo
			socketid: socket.id								//id del socket
		};		
	});
	
	// Callback para atender mensaje 'mensaje'
	socket.on('message', function(mensaje) {
		console.log("mensaje recibido: " + mensaje);
		//acciones para cada mensaje que se recibe
		switch(mensaje){
			//evento estado 1: jugador 0 selecciona boton de inicio del juego
			case 'started':	
				juego['estadotxt'] = "Iniciando partida...";			
				crearmesatapada();
				barajar();
				cazaralpozo();
				updatesqldinero();
				darfichas();
				quienbaraja();
				juego['estadotxt'] = namejuga[juego['quienbaraja']] + " esta repartiendo cartas...";
				repartircartas();		
				juego['estadotxt'] = "Le toca a " + namejuga[juego['turno']] + " coger carta...";
				juego['estado'] = 2;
				break;
			//evento estado 2: jugador coge carta tapada, nadie se ha bajado
			case 'mesatapada':	
				juego[juego['turno']].cartas.push(juego['mesatapada'].pop());
				juego['estadotxt'] = namejuga[juego['turno']] + " tomo nueva carta, que devuelva...";
				juego['estado'] = 3;
				break;
			//evento estado 2: jugador coge carta abierta, nadie se ha bajado
			case 'mesaabierta':	
				juego[juego['turno']].cartas.push(juego['mesaabierta'].pop());				
				juego['estadotxt'] = namejuga[juego['turno']] + " tomo carta anterior, que devuelva...";
				juego['estado'] = 3;
				break;
			//evento estado 3: jugador escoge carta que va a devolver, nadie se ha bajado
			case 'micarta0':				
			case 'micarta1':			
			case 'micarta2':			
			case 'micarta3':	
				juego['mesaabierta'].push(juego[juego['turno']].cartas.splice(parseInt(mensaje.substr(7)),1));	
				if(juego['mesatapada'].length == 0) rebarajar();
				siguienteturno();
				juego['estadotxt'] = "Le toca a " + namejuga[juego['turno']] + " coger carta...";
				juego['estado'] = 2;
				break;
			//evento estado 3: jugador selecciona boton de bajarse
			case 'bajarse':	
				juego['estadotxt'] = namejuga[juego['turno']] + " se bajo, que devuelva carta...";
				juego[juego['turno']].bajado = true;
				juego['estado'] = 4;
				break;
			//evento estado 4: jugador escoge carta que va a devolver, alguien se ha bajado
			case 'micartab0':				
			case 'micartab1':			
			case 'micartab2':			
			case 'micartab3':	
				juego['mesaabierta'].push(juego[juego['turno']].cartas.splice(parseInt(mensaje.substr(8)),1));	
				if(juego['mesatapada'].length == 0) rebarajar();
				siguienteturno();
				//si el siguiente turno ya esta bajado esta ronda termina (todos los jugadores se han bajado)
				if(juego[juego['turno']].bajado){
					calcularesultados();
					pagarganador();					
					updatesqlvecesganadas();
					quitarficha();
					vereliminarjugador();
					//se tiene un batatazo o ya solo queda un jugador en mesa, el juego ha terminado
					if(juego['batatazo'] || getnplayers() == 1){
						entregarpozo();						
						juego['estadotxt'] = "Ganador final: " + namejuga[juego['ganador']];
						juego['estado'] = 7;
					//se acaba esta ronda pero continua el juego
					} else {							
						juego['estadotxt'] = "Ganador: " + namejuga[juego['ganador']] + ", Perdedor: " + namejuga[juego['perdedor']];
						juego['estado'] = 6;						
					}	
					updatesqldinero();					
				//si el siguiente turno no esta bajado la ronda continua
				} else{
					juego[juego['turno']].bajado = true;
					juego['estadotxt'] = "Le toca a " + namejuga[juego['turno']] + " coger carta...";
					juego['estado'] = 5;					
				}	
				break;				
			//evento estado 5: jugador coge carta tapada, alguien se ha bajado
			case 'mesatapadab':	
				juego[juego['turno']].cartas.push(juego['mesatapada'].pop());
				juego['estadotxt'] = namejuga[juego['turno']] + " tomo nueva carta, que devuelva...";
				juego['estado'] = 4;
				break;
			//evento estado 5: jugador coge carta abierta, alguien se ha bajado
			case 'mesaabiertab':	
				juego[juego['turno']].cartas.push(juego['mesaabierta'].pop());				
				juego['estadotxt'] = namejuga[juego['turno']] + " tomo carta anterior, que devuelva...";
				juego['estado'] = 4;
				break;
			//evento estado 6: jugador selecciona boton de continuar con una nueva ronda
			case 'continua':
				juego['mesaabierta'] = [];
				juego['mesatapada'] = [];
				crearmesatapada();
				quitarcartas();
				juego['quienbaraja'] = juego['ganador'];
				juego['turno'] = -1;
				juego['ganador'] = -1;
				juego['perdedor'] = -1;
				juego['batatazo'] = false;
				juego['is31'] = false;
				barajar();				
				juego['estadotxt'] = namejuga[juego['quienbaraja']] + " esta repartiendo cartas...";
				repartircartas();		
				juego['estadotxt'] = "Le toca a " + namejuga[juego['turno']] + " coger carta...";
				juego['estado'] = 2;
				break;
			//evento estado 7: jugador selecciona boton de final del juego
			case 'final':	
        //desconecta a todos los jugadores, les envia un mensaje de desconexión
				io.sockets.emit('desconectar', '');		
				for(var socketname in io.sockets.sockets){
					io.sockets.sockets[socketname].disconnect(true);			
				}
				juego['pozo'] = 0;
				juego['puestos'] = [-1,-1,-1,-1,-1,-1,-1];
				juego['mesatapada'] = [];
				juego['mesaabierta'] = [];
				juego['quienbaraja'] = -1;
				juego['turno'] = -1;
				juego['ganador'] = -1;
				juego['perdedor'] = -1;
				juego['batatazo'] = false;
				juego['is31'] = false;				
				juego['estadotxt'] = "Esperar al anfitrion...";				
				juego['estado'] = 0;
				break;
			default:
		}
	});
    // var player = juego[socket.id] || {};
});

//funcion para aumentar en uno las veces que ha ganado el ganador de la ronda en la db
function updatesqlvecesganadas(){
	let db = new sqlite3.Database('treintayuno.db', sqlite3.OPEN_READWRITE, (err) => {
		if (err) {
		console.error(err.message);
	}
	console.log('Connected db vecesganadas');
	});	
	
	db.serialize(() => {
		db.run("UPDATE player SET veces = veces + 1 WHERE id = " + juego['ganador'], function(err) {
		if (err) {
			return console.error(err.message);
		}
		console.log("Updated db vecesganadas");

		});
	});

	db.close((err) => {
		if (err) {
			console.error(err.message);
		}
		console.log('Closed db vecesganadas');
	});
}

//funcion para actualizar en db el dinero que tiene cada jugador luego de cada asignacion de dinero, aqui solo hace una barrido de los
//puestos para ver quien esta en mesa y luego llama a otra funcion que hace en realidad la tarea de actualizacion
function updatesqldinero(){	
	for (var i = 0; i < juego['puestos'].length; i++) {
		if(juego['puestos'][i] == -1) continue;
		updatesqldinero2(i);
	}	
}

//funcion para actualizar el dinero de un jugador en base al que tiene en la variable
function updatesqldinero2(ii) {
	console.log("puesto: " + ii + " dinero: " + juego[juego['puestos'][ii]].dinero);	
	let db = new sqlite3.Database('treintayuno.db', sqlite3.OPEN_READWRITE, (err) => {
		if (err) {
		console.error(err.message);
	}
	console.log('Connected db dinero2');
	});	
	
	var sql = "UPDATE player SET dinero = " + juego[juego['puestos'][ii]].dinero + " WHERE id = " + juego['puestos'][ii];
	db.serialize(() => {
		db.run(sql, function(err) {
		if (err) {
			return console.error(err.message);
		}
		console.log("Updated db dinero2");

		});
	});

	db.close((err) => {
		if (err) {
			console.error(err.message);
		}
		console.log('Closed db dinero2');
	});	
}

//funcion para actualizar el dinero de un jugador en base al que tiene en la variable
function updatesqldinero3(ii, ii_dinero) {
	console.log("player eliminado: " + ii + " dinero: " + ii_dinero);	
	let db = new sqlite3.Database('treintayuno.db', sqlite3.OPEN_READWRITE, (err) => {
		if (err) {
		console.error(err.message);
	}
	console.log('Connected db dinero3');
	});	
	
	var sql = "UPDATE player SET dinero = " + ii_dinero + " WHERE id = " + ii;
	db.serialize(() => {
		db.run(sql, function(err) {
		if (err) {
			return console.error(err.message);
		}
		console.log("Updated db dinero3");

		});
	});

	db.close((err) => {
		if (err) {
			console.error(err.message);
		}
		console.log('Closed db dinero3');
	});	
}

//funcion para cargar desde db las variables globales de todos los jugadores: nombre, dinero y si es hombre
function cargasqlvariables(){
    let db = new sqlite3.Database('treintayuno.db', sqlite3.OPEN_READONLY, (err) => {
		if (err) {
		console.error(err.message);
	}
	console.log('Connected db cargarvariables');
	});	
	
	db.serialize(() => {
		db.each("SELECT * FROM player", (err, row) => {
			if (err) {
				console.error(err.message);
			}
			// console.log(row.nombre + "\t" + row.dinero);
			namejuga[row.id] = row.nombre;
			ismanjuga[row.id] = row.eshombre;
			dinerojuga[row.id] = row.dinero;
		});
	});

	db.close((err) => {
		if (err) {
			console.error(err.message);
		}
		console.log('Closed db cargarvariables');
	});
}

//funcion para asignar el pozo al jugador que gano el juego
function entregarpozo() {
	juego[juego['ganador']].dinero = sumardecimal(juego[juego['ganador']].dinero, juego['pozo']);
	juego['pozo'] = 0;
}

//funcion que entrega el numero de jugadores en la mesa
function getnplayers() {
	var tpuestos = juego['puestos'].filter(getnpuestos);
	function getnpuestos(value, index, array) {
		return value != -1;
	}
	return tpuestos.length;
}

//funcion que quita una ficha al perdedor
function quitarficha() {
	juego[juego['perdedor']].fichas -= 1;
}

//funcion que verifica si en la mesa hay algun jugador con cero fichas, en tal caso los borra de la mesa, y le quita sus cartas
function vereliminarjugador(){
	for (var i = 0; i < juego['puestos'].length; i++) {
		if(juego['puestos'][i] == -1) continue;
		if(juego[juego['puestos'][i]].fichas < 1) {
			juego[juego['puestos'][i]].cartas = [];
			//se necesita almacenar el jugador eliminado y su dinero para el tema de update sql
			updatesqldinero3(juego['puestos'][i], juego[juego['puestos'][i]].dinero);
			juego['puestos'][i] = -1;			
		}
	}	
}

//funcion que asigna al ganador el dinero de cada jugador por haber ganado la ronda, a los perdedores les quita el dinero entregado al ganador
function pagarganador() {
	for (var i = 0; i < juego['puestos'].length; i++) {
		if(juego['puestos'][i] == -1)continue;
		if(juego['puestos'][i] == juego['ganador'])continue;
		juego[juego['ganador']].dinero = sumardecimal(juego[juego['ganador']].dinero, 0.1 * (juego['is31'] ? 2 : 1));
		juego[juego['puestos'][i]].dinero = sumardecimal(juego[juego['puestos'][i]].dinero, -0.1 * (juego['is31'] ? 2 : 1));
	}
}

//funcion que les quita las cartas a todos los jugadores, principalmente al ganador del juego que queda con una carta y fichas; tambien
//resetea las banderas de bajado a todos los jugadores
function quitarcartas() {
	for (var i = 0; i < juego['puestos'].length; i++) {
		if(juego['puestos'][i] == -1)continue;
		juego[juego['puestos'][i]].cartas = [];
		juego[juego['puestos'][i]].bajado = false;
	}
}

//funcion calcula el ganador y el perdedor de cada ronda
function calcularesultados() {
	// juego['1'].cartas = [0, 13, 26]; //batatazo
	
	// juego['0'].cartas = [0, 1, 12]; //mismo valor ganador
	// juego['1'].cartas = [13, 14, 25];
	
	// juego['2'].cartas = [0, 11, 12]; //31 ganador
	
	// juego['3'].cartas = [0, 1, 12]; //mismo valor y palo ganador
	// juego['5'].cartas = [2, 10, 11];
	
	// juego['2'].cartas = [1, 2, 3]; //mismo valor perdedor
	// juego['5'].cartas = [14, 15, 16];
	
	// juego['3'].cartas = [1, 4, 12]; //mismo valor y palo perdedor
	// juego['0'].cartas = [2, 3, 11];
	
	//extraer resultados
	var indices = [];							//almacena los id de los jugadores en la mesa
	var valores = [];							//almacena el array de las sumas de las cartas por palo de los jugadores en la mesa
	var maximos = [];							//almacena la suma mas alta de cada jugador
	var batatazo = -1;
	//por cada jugador calcula su resultado
	for (var i = 0; i < juego['puestos'].length; i++) {
		if(juego['puestos'][i] == -1)continue;
		var valorpalo = [0, 0, 0, 0];												//almacena la suma de cartas por cada palo, en el orden:
																					//[brillo, rojo, negro, treboles]
		//por cada carta se calcula a que slot de 'valor palo' debe sumar
		for (var j = 0; j < juego[juego['puestos'][i]].cartas.length; j++) {
			var ncarta = juego[juego['puestos'][i]].cartas[j]%13 + 1;				//calcula el numero de la carta, mapeo del numero del sprite
			if(ncarta > 10) ncarta = 10;
			if(ncarta == 1) ncarta = 11;	
			var npalo = Math.floor(juego[juego['puestos'][i]].cartas[j]/13);		//calcula el palo de la carta, mapeo del numero del sprite
			var ordenpalo = [2, 1, 0, 3];											//el array sirve para remapear los palos, sprite vs natural
			valorpalo[ordenpalo[npalo]] += ncarta;									//suma el valor de la carta al palo correspondiente
		}				
		//valida batatazo, que todas las cartas seas ases, el id del batateador se almacena en 'batatazo'
		if(juego[juego['puestos'][i]].cartas.every(allases)) batatazo = juego['puestos'][i];
		function allases(value, index, array) {
			return value%13 == 0;
		}
		//almacena resultados
		indices.push(juego['puestos'][i]);	
		valores.push(valorpalo);
		maximos.push(Math.max.apply(null, valorpalo));
		console.log(namejuga[juego['puestos'][i]] + " resultado: " + valorpalo);
	}
	console.log("Resumen= indices: " + indices + " valores: " + valores + " maximos: " + maximos);
	console.log("batatazo: " + batatazo);
	
	//calcula ganador
	var elganador = -1;
	var isbatatazo = false;
	var is31 = false;
	//primero valida si hubo batatazo, en ese caso ya hay ganador
	if(batatazo != -1){
		elganador = batatazo;
		isbatatazo = true;
	//si no hubo batatazo hay que calcular entonces quien tiene el mayor valor
	} else{
		var valormax = Math.max.apply(null, maximos);			//calcula el maximo de los maximos de cada jugador
		if(valormax == 31) is31 = true;							//revisa si el maximo es 31
		var losmayores = [];									//almacena los ids de los jugadores que tienen el valor maximo
		var losmayores_index = [];								//almacena los indices en el array 'maximos' de los que tienen el valor maximo
		for(i = 0; i < maximos.length; i++){
			if(maximos[i] == valormax){
				losmayores.push(indices[i]);
				losmayores_index.push(i);				
			}
		}
		console.log("calculo ganador= valormax: " + valormax + " losmayores: " + losmayores + " losmayores_index: " + losmayores_index);
		//si solo hay un jugador con el valor maximo ya gano
		if(losmayores.length == 1){
			elganador = losmayores[0];
		// si hay mas jugadores con el valor maximo entonces se tiene que ver el mayor palo
		} else {
			var losmayores_palo = [];		//almacena para cada jugador con valor maximo, el palo (indice del array 'valorpalo') que corresponde
											//a su valor maximo
			for(i = 0; i < losmayores_index.length; i++){				
				losmayores_palo.push(valores[losmayores_index[i]].findIndex(quepalo));
				function quepalo(value, index, array) {
				  return value == valormax;
				}				
			}
			var palomin = Math.min.apply(null, losmayores_palo);		//calcula el palo (indice del array 'valorpalo') mejor (el menor indice)
			var losmejorespalos = [];									//almacena los ids de jugadores igualados en valor con los mejores palos
			var losmejorespalos_index = [];								//almacena los indices en el array 'maximos' de los que tienen el mejor palo
			for(i = 0; i <losmayores_palo.length; i++){
				if(losmayores_palo[i] == palomin){					
					losmejorespalos.push(losmayores[i]);
					losmejorespalos_index.push(losmayores_index[i]);
				}
			}
			console.log("losmayores_palo: " + losmayores_palo + " palomin: " + palomin + " losmejorespalos: " + losmejorespalos 
				+ " losmejorespalos_index: " + losmejorespalos_index);
			//si solo hay un jugador de los igualados en valor con el mejor palo ya gano
			if(losmejorespalos.length == 1){
				elganador = losmejorespalos[0];
			//si hay varios jugadores igualados en valor y palo se hace ramdomise
			} else{
				losmejorespalos = losmejorespalos.sort(() => Math.random() - 0.5);
				elganador = losmejorespalos[0];
			}			
		}
	}
	juego['ganador'] = elganador;
	juego['batatazo'] = isbatatazo;
	juego['is31'] = is31;
	console.log("ganador: " + elganador + " batatazo: " + isbatatazo + " is31: " + is31);
	
	//eliminar al ganador de las variables de resultados
	var posicionganador = indices.indexOf(elganador);
	indices.splice(posicionganador,1);
	valores.splice(posicionganador,1);
	maximos.splice(posicionganador,1);
	console.log("Resumen luego de ganador= indices: " + indices + " valores: " + valores + " maximos: " + maximos);
	
	//calcula perdedor
	var elperdedor = -1;
	var valormin = Math.min.apply(null, maximos);		//calcula el minimo de los maximos de cada jugador
	var losmenores = [];								//almacena los ids de los jugadores que tienen el valor minimo	
	var losmenores_index = [];							//almacena los indices en el array 'maximos' de los que tienen el valor minimo
	for(i = 0; i < maximos.length; i++){
		if(maximos[i] == valormin){
			losmenores.push(indices[i]);
			losmenores_index.push(i);				
		}
	}
	console.log("calculo perdedor= valormin: " + valormin + " losmenores: " + losmenores + " losmenores_index: " + losmenores_index);
	//si solo hay un jugador con el valor minimo ya perdio
	if(losmenores.length == 1){
		elperdedor = losmenores[0];
	// si hay mas jugadores con el valor minimo entonces se tiene que ver el peor palo
	} else {
		var losmenores_palo = [];		//almacena para cada jugador con valor minimo, el palo (indice del array 'valorpalo') que corresponde
										//a su valor minimo
		for(i = 0; i < losmenores_index.length; i++){				
			losmenores_palo.push(valores[losmenores_index[i]].findIndex(quepalo));
			function quepalo(value, index, array) {
			  return value == valormin;
			}				
		}
		var palomax = Math.max.apply(null, losmenores_palo);		//calcula el palo (indice del array 'valorpalo') peor (el mayor indice)
		var lospeorespalos = [];									//almacena los ids de jugadores igualados en valor con los peores palos
		var lospeorespalos_index = [];								//almacena los indices en el array 'maximos' de los que tienen el peor palo
		for(i = 0; i <losmenores_palo.length; i++){
			if(losmenores_palo[i] == palomax){					
				lospeorespalos.push(losmenores[i]);
				lospeorespalos_index.push(losmenores_index[i]);
			}
		}
		console.log("losmenores_palo: " + losmenores_palo + " palomax: " + palomax + " lospeorespalos: " + lospeorespalos 
			+ " lospeorespalos_index: " + lospeorespalos_index);
		//si solo hay un jugador de los igualados en valor con el peor palo ya perdio
		if(lospeorespalos.length == 1){
			elperdedor = lospeorespalos[0];
		//si hay varios jugadores igualados en valor y palo se hace ramdomise
		} else{
			lospeorespalos = lospeorespalos.sort(() => Math.random() - 0.5);
			elperdedor = lospeorespalos[0];
		}
		
	}
	juego['perdedor'] = elperdedor;
	console.log("perdedor: " + elperdedor);
}

//funcion hace un barajamiento de las cartas de la mesa abierta porque se acabaron en la mesa tapada, y deja el de arriba en la mesa abierta
function rebarajar() {
	juego['mesatapada'] = juego['mesaabierta'].slice();		//se hace una copia del array sin mantener la misma referencia al array
	juego['mesaabierta'] = juego['mesatapada'].pop();
	barajar();
}

//funcion calcula a quien le toca el turno de coger carta basandose en el orden de barajo (funcion ordenbarajo), seria el que esta a la derecha
//del que tuvo el turno anterior (como atajo se usa esa funcion usando el que tuvo el turno como repartidor aunque no repartio)
function siguienteturno() {
	var puestobarajo = ordenbarajo(juego['turno']);
	juego['turno'] = puestobarajo[0];
}

//funcion entrega cartas de la mesa tapada siguiendo el orden de barajo calculado, se entrega 3 cartas a cada jugador, luego el turno le toca
//al que esta a la derecha del repartidor osea el primero del orden de barajo
function repartircartas() {
	var puestobarajo = ordenbarajo(juego['quienbaraja']);
	console.log("orden de barajo: " + puestobarajo);
	for(var i = 0; i < puestobarajo.length * 3; i++){
		juego[puestobarajo[i % puestobarajo.length]].cartas.push(juego['mesatapada'].pop());
	}
	juego['turno'] = puestobarajo[0];
}

//funcion crea un array nuevo basado en los puestos que ocupan los jugadores en la mesa, el nuevo array inicia con el jugador que esta a su
//derecha y asi sigue agredando y el ultimo es el repartidor
function ordenbarajo(repartidor) {
	var tpuestos = juego['puestos'].filter(gettpuestos);
	function gettpuestos(value, index, array) {
		return value != -1;
	}
	var iplayer = tpuestos.indexOf(repartidor);
	var tpuestos2 = tpuestos.slice(iplayer + 1).concat(tpuestos.slice(0, iplayer));
	tpuestos2.reverse();
	tpuestos2.push(repartidor);
	return tpuestos2;
}

//funcion para asignar las fichas a cada jugador
function darfichas() {
	for (var i = 0; i < juego['puestos'].length; i++) {
		if(juego['puestos'][i] == -1)continue;
		juego[juego['puestos'][i]].fichas = n_fichas;
	}
}

//funcion que calcula quien va a barajar, sacando una copia del array luego randomizandolo, para escoger el primer jugador del nuevo array
function quienbaraja() {
	var temp_posicion = juego['puestos'].slice();
	temp_posicion = randomizar(temp_posicion);
	for (var i = 0; i < temp_posicion.length; i++) {
		if(temp_posicion[i] != -1){
			juego['quienbaraja'] = temp_posicion[i];
			console.log("quien baraja: " + namejuga[juego['quienbaraja']] + " random para quienbajada: " + temp_posicion);
			return;
		}
	}	
}

//funcion que asigna dinero al pozo al inicio del juego y les quita ese aporte a cada jugador
function cazaralpozo() {
	for (var i = 0; i < juego['puestos'].length; i++) {
		if(juego['puestos'][i] == -1)continue;
		juego[juego['puestos'][i]].dinero = sumardecimal(juego[juego['puestos'][i]].dinero, -0.5);
		juego['pozo'] = sumardecimal(juego['pozo'], 0.5);
	}
}

//funcion que randomiza las cartas de la mesa tapada
function barajar() {
	juego['mesatapada'] = randomizar(juego['mesatapada']);
	console.log("mesatapada barajada: " + juego['mesatapada']);
}

//funcion crea la mesa tapada con las 52 cartas en orden natural, el significado de cada numero depende del sprite de las cartas
function crearmesatapada() {
	for (var i = 0; i < 52; i++) {
		juego['mesatapada'].push(i);
	}
}

//funcion asigna su id en una posicion de la mesa, que seria el siguiente slot a los ya asignados
function ubicarpuesto(iplayer) {
	for (var i = 0; i < juego['puestos'].length; i++) {
		if(juego['puestos'][i] == -1){
			juego['puestos'][i] = iplayer;
			return;
		}
	}
}

//funcion ramdomise
function randomizar(lista){
	var i, j, k;
	for (i = lista.length -1; i > 0; i--) {
		j = Math.floor(Math.random() * i);
		k = lista[i];
		lista[i] = lista[j];
		lista[j] = k;
	}
	return lista;
}

//funcion para sumar decimales sin generar tanto cero
function sumardecimal(sumando,sumador){
	return ((sumando * 10 + sumador * 10) / 10);
}

//emite a todos los usuarios conectados el estado del juego, cada segundo
setInterval(function() {
	// io.sockets.clients((error, clients) => {
	  // if (error) throw error;
	  // console.log(clients); // => [PZDoMHjiu8PYfRiKAAAF, Anw2LatarvGVVXEIAAAD]
	// });		
	io.sockets.emit('state', juego);
}, 1000);

var textsql;
app.get("/stats", (request, response) => {	
	var ordenada = [];
	let db = new sqlite3.Database('treintayuno.db', sqlite3.OPEN_READONLY, (err) => {
		if (err) {
			console.error(err.message);
		}
		console.log('Connected db stats');
		response.writeHead(200, {'Content-Type': 'text/html'});
		textsql = "";
		textsql += "<html><head><style>table {  border-collapse: collapse;  border-spacing: 0;  width: 100%;  border: 1px solid #ddd;}";
		textsql += "th, td {  text-align: left;  padding: 16px; } tr:nth-child(even) { background-color: #f2f2f2;}</style></head><body><table>";
		textsql += "<tr><th>Nombre</th><th>Dinero</th><th>Veces ganadas</th></tr>";
	});	
	
	db.serialize(() => {
		db.each("SELECT * FROM player", (err, row) => {
			if (err) {
				console.error(err.message);
			}
			textsql += "<tr><th>"+row.nombre+"</th><th>"+row.dinero+"</th><th>"+row.veces+"</th></tr>";
		});		
	});

	db.close((err) => {
		if (err) {
			console.error(err.message);
		}
		textsql += "</table></body></html>";
		console.log('Closed db stats');
		response.write(textsql);
		return response.end();
	});	
	
});

//Funcion para responder la solicitud inicial. Se responde al usuario con el index.html.
app.get("/admin", function(request, response) {
  response.sendFile(__dirname + "/admin.html");
});

// Create application/x-www-form-urlencoded parser
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

app.post("/adminagregar", function(request, response) {
  console.log(request.body);
  let db = new sqlite3.Database('treintayuno.db', sqlite3.OPEN_READWRITE, (err) => {
  	if (err) {
  	   console.error(err.message);
  	}
	  console.log('Connected to the treintayuno database.');
	});

	db.serialize(() => {
		db.run("INSERT INTO player VALUES (" + request.body.addid + "," + request.body.addveces + "," + request.body.adddinero
      + ",'" + request.body.addname + "',"	+ request.body.addeshombre +  ")", function(err) {
  		if (err) {
        response.end('{"resultado":"error"}');
  			return console.error(err.message);
  		}
  		console.log("Row(s) inserted");
      response.end('{"resultado":"exito"}');
		});
	});

	db.close((err) => {
		if (err) {
			console.error(err.message);
		}
		console.log('Close the database connection.');
	});
});

app.post("/adminborrar", function(request, response) {
  console.log(request.body);
  let db = new sqlite3.Database('treintayuno.db', sqlite3.OPEN_READWRITE, (err) => {
  	if (err) {
  	   console.error(err.message);
  	}
	  console.log('Connected to the treintayuno database.');
	});

	db.serialize(() => {
		db.run("DELETE FROM player where id = " + request.body.p, function(err) {
  		if (err) {
        response.end('{"resultado":"error"}');
  			return console.error(err.message);
  		}
  		console.log("Row(s) deleted");
      response.end('{"resultado":"exito"}');
		});
	});

	db.close((err) => {
		if (err) {
			console.error(err.message);
		}
		console.log('Close the database connection.');
	});
});

app.post("/admindardinero", function(request, response) {
  console.log(request.body);
  let db = new sqlite3.Database('treintayuno.db', sqlite3.OPEN_READWRITE, (err) => {
  	if (err) {
  	   console.error(err.message);
  	}
	  console.log('Connected to the treintayuno database.');
	});

	db.serialize(() => {
		db.run("UPDATE player SET dinero = dinero + " + request.body.dinero + " WHERE id = " + request.body.p, function(err) {
  		if (err) {
        response.end('{"resultado":"error"}');
  			return console.error(err.message);
  		}
  		console.log("Row(s) updated");
      response.end('{"resultado":"exito"}');
		});
	});

	db.close((err) => {
		if (err) {
			console.error(err.message);
		}
		console.log('Close the database connection.');
	});
});

app.get("/adminresetear", function(request, response) {
  response.end('{"resultado":"exito"}');
});
