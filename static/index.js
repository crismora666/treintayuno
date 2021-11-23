//elementos DOM utilizados
const playersSelect = document.getElementById("players");
const treintayunoForm = document.querySelector("form");
const backGround = document.getElementsByClassName("bg-img");
console.log(treintayunoForm);

//variables del programa
var socket;
var player;
var context;
var a;																//calcula los factores de conversion de coordenadas
var l;
var stats = [true, true, true, true, true, true, true];				//banderas para indicar estado de los listeners
var juegoestado = 0;

//banderas para desarrollo
var playlocal = false;					//juega localmente

//inicializa las imagenes
var img_fondo = new Image();
img_fondo.src = playlocal?'static/cardstable.jpg':'https://cdn.glitch.com/44e8e9d5-50f0-44bc-a4a1-fa65893b2a22%2Fcardstable.JPG?v=1594009580856';
var img_pozo = new Image();
img_pozo.src = playlocal?'static/pozo.svg':'https://cdn.glitch.com/44e8e9d5-50f0-44bc-a4a1-fa65893b2a22%2Fpozo.svg?v=1594009603362';
var img_cartatapada = new Image();
img_cartatapada.src = playlocal?'static/cardback.svg':'https://cdn.glitch.com/44e8e9d5-50f0-44bc-a4a1-fa65893b2a22%2Fcardback.svg?v=1594009576679';
var img_cartaabierta = new Image();
img_cartaabierta.src = playlocal?'static/playingcards.svg':'https://cdn.glitch.com/44e8e9d5-50f0-44bc-a4a1-fa65893b2a22%2Fplayingcards.svg?v=1594009599076';
var img_fichas = new Image();
img_fichas.src = playlocal?'static/ficha.svg':'https://cdn.glitch.com/44e8e9d5-50f0-44bc-a4a1-fa65893b2a22%2Fficha.svg?v=1594009589452';
var img_boton = new Image();
img_boton.src = playlocal?'static/boton.svg':'https://cdn.glitch.com/44e8e9d5-50f0-44bc-a4a1-fa65893b2a22%2Fboton.svg?v=1594009544959';
var img_jugadorm1 = new Image();
img_jugadorm1.src = playlocal?'static/man1.svg':'https://cdn.glitch.com/44e8e9d5-50f0-44bc-a4a1-fa65893b2a22%2Fman1.svg?v=1594009594260';
var img_jugadorw1 = new Image();
img_jugadorw1.src = playlocal?'static/woman1.svg':'https://cdn.glitch.com/44e8e9d5-50f0-44bc-a4a1-fa65893b2a22%2Fwoman1.svg?v=1594009606485';

// a helper function that creates a option item for a given player
function appendNewPlayer(plyrdb) {
  const newOptionItem = document.createElement("option");
  newOptionItem.value = plyrdb[0];
  newOptionItem.innerText = plyrdb[1];
  if (getCookie("jugador") != "" && getCookie("jugador") == plyrdb[0]) {
		newOptionItem.selected = true;
	}
  playersSelect.appendChild(newOptionItem);
}

fetch("/players")
  .then(response => response.json()) // parse the JSON from the server
  .then(players => {
	  console.log(players);
	  playersSelect.firstElementChild.remove();
	  players.forEach(appendNewPlayer);
});

treintayunoForm.addEventListener("submit", event => {
    event.preventDefault();	
	switch(juegoestado){
		case 0:
			var formData = new FormData(event.target);
			player = formData.get("p");									//obtiene el id del jugador
      setCookie("jugador", player, 365);
			backGround[0].style.background = "none";	
			treintayunoForm.style.display = "none";	
			document.getElementById("cuerpo").innerHTML = "El anfitri\u00F3n ha finalizado el juego.";
			treintayunoForm.elements[0].remove();
			treintayunoForm.elements[0].innerHTML = "Volver a jugar";			
			var dimension = [document.documentElement.clientWidth, document.documentElement.clientHeight];	//obtiene el tamaño total de la pantalla
			const canvas = document.createElement("canvas");			//crea un elemento canvas para la graficacion y le asigna el tamaño, id y borde	
			canvas.width = dimension[0] - 50;
			canvas.height = dimension[1] - 50;
			canvas.id= "canvas";
			canvas.style.border= "1px solid #d3d3d3";
			backGround[0].appendChild(canvas);
			context = canvas.getContext("2d");
			a = canvas.width / 793;	
			l = canvas.height / 529;
			socket = io();
			
			socket.on('state', function(juego) {
				//dependiendo del estado regresa a true banderas de listeners que han sido puestos en false en estados previos
				if(juego['estado'] == 0) stats[7] = true;
				if(juego['estado'] == 1) stats[7] = true;
				if(juego['estado'] == 2) stats[0] = true;
				if(juego['estado'] == 2) stats[2] = true;
				if(juego['estado'] == 2) stats[5] = true;
				if(juego['estado'] == 2) stats[6] = true;
				if(juego['estado'] == 3) stats[1] = true;
				if(juego['estado'] == 4) stats[1] = true;
				if(juego['estado'] == 4) stats[4] = true;
				if(juego['estado'] == 5) stats[3] = true;
				if(juego['estado'] == 6) stats[3] = true;
				if(juego['estado'] == 7) stats[3] = true;
				
				//tablero de cartas
				if(juego['estado'] == 0 || juego['estado'] == 1 || juego['estado'] == 2 || juego['estado'] == 3 || juego['estado'] == 4 
					|| juego['estado'] == 5 || juego['estado'] == 6 || juego['estado'] == 7){		
					context.drawImage(img_fondo, 0, 0, 793 * a, 529 * l);
				}
				
				//tu dinero
				if(juego['estado'] == 1 || juego['estado'] == 2 || juego['estado'] == 3 || juego['estado'] == 4 || juego['estado'] == 5 
					|| juego['estado'] == 6 || juego['estado'] == 7){
					context.font = "20px Arial";
					context.fillStyle = "white";
					context.textAlign = "left";
					context.fillText("Tu dinero: $" + juego[player].dinero, 20 * a, 515 * l);
				}
				
				//estado
				if(juego['estado'] == 0 || juego['estado'] == 1 || juego['estado'] == 2 || juego['estado'] == 3 || juego['estado'] == 4 
					|| juego['estado'] == 5 || juego['estado'] == 6 || juego['estado'] == 7){
					context.font = "17px Arial";
					context.fillStyle = "white";
					context.textAlign = "center";
					context.fillText(juego['estadotxt'], 397 * a, 232 * l);
				}
				
				//pozo
				if(juego['estado'] == 2 || juego['estado'] == 3 || juego['estado'] == 4 || juego['estado'] == 5 || juego['estado'] == 6 || juego['estado'] == 7){		
					context.drawImage(img_pozo, 233 * a, 264 * l, 50 * a, 35 * l);
				}
				
				//pozo texto
				if(juego['estado'] == 2 || juego['estado'] == 3 || juego['estado'] == 4 || juego['estado'] == 5 || juego['estado'] == 6 || juego['estado'] == 7){
					context.font = "13px Arial";
					context.fillStyle = "white";
					context.textAlign = "center";
					context.fillText("Pozo $" + juego['pozo'], 258 * a, 312 * l);
				}
				
				//cartas mesa tapadas
				if(juego['estado'] == 2 || juego['estado'] == 3 || juego['estado'] == 4 || juego['estado'] == 5 || juego['estado'] == 6 || juego['estado'] == 7){
					if(juego['mesatapada'].length > 0){			
						context.drawImage(img_cartatapada, 315 * a, 247 * l, 70 * a, 90 * l);
					}
				}
				
				//cartas mesa tapadas texto
				if(juego['estado'] == 2 || juego['estado'] == 3 || juego['estado'] == 4 || juego['estado'] == 5 || juego['estado'] == 6 || juego['estado'] == 7){
					context.font = "15px Arial";
					context.fillStyle = "white";
					context.textAlign = "center";
					context.fillText(juego['mesatapada'].length, 350 * a, 352 * l);
				}		
				
				//cartas mesa abiertas
				if(juego['estado'] == 2 || juego['estado'] == 3 || juego['estado'] == 4 || juego['estado'] == 5 || juego['estado'] == 6 || juego['estado'] == 7){
					if(juego['mesaabierta'].length > 0){			
						context.drawImage(img_cartaabierta, 30 + (juego['mesaabierta'][juego['mesaabierta'].length-1]%13) * 390, 
							30 + Math.floor(juego['mesaabierta'][juego['mesaabierta'].length-1]/13) * 570, 360, 540, 415 * a, 247 * l, 70 * a, 90 * l);
					}
				}
				
				//cartas mesa abiertas texto
				if(juego['estado'] == 2 || juego['estado'] == 3 || juego['estado'] == 4 || juego['estado'] == 5 || juego['estado'] == 6 || juego['estado'] == 7){
					context.font = "15px Arial";
					context.fillStyle = "white";
					context.textAlign = "center";
					context.fillText(juego['mesaabierta'].length, 450 * a, 352 * l);
				}
				
				//recuadros cartas mesa
				if(juego['estado'] == 3 || juego['estado'] == 4){
					context.strokeStyle = "#FFFF00";
					context.lineWidth = 3;
					if(juego['estadotxt'].indexOf("bajo") == -1)
						context.strokeRect((juego['estadotxt'].indexOf("nueva") >= 0?315:415) * a, 247 * l, 70 * a, 90 * l);
					context.strokeStyle = "#000000";
					context.lineWidth = 1;
				}
				
				//mis cartas
				if(juego['estado'] == 2 || juego['estado'] == 3 || juego['estado'] == 4 || juego['estado'] == 5 || juego['estado'] == 6 || juego['estado'] == 7){
					for(var i = 0; i < juego[player].cartas.length; i++){
						context.drawImage(img_cartaabierta, 30 + (juego[player].cartas[i]%13) * 390, 30 + Math.floor(juego[player].cartas[i]/13) * 570, 360, 
							540, (280 + 80 * i) * a, 430 * l, 70 * a, 90 * l);
					}	
				}
				
				//mis fichas
				if(juego['estado'] == 2 || juego['estado'] == 3 || juego['estado'] == 4 || juego['estado'] == 5 || juego['estado'] == 6 || juego['estado'] == 7){
					for(i = 0; i < juego[player].fichas; i++){			
						context.drawImage(img_fichas, (626 + 40 * i) * a, 487 * l, 30 * a, 30 * l);
					}
				}
				
				//tuturno texto
				if((juego['estado'] == 2 || juego['estado'] == 3 || juego['estado'] == 4 || juego['estado'] == 5) && player == juego['turno']){
					context.font = "50px Charcoal";
					context.fillStyle = "cyan";
					context.textAlign = "center";
					context.fillText("TU TURNO", 680 * a, 45 * l);
				}
				
				var tpuestos = juego['puestos'].filter(gettpuestos);		//obtiene la lista de jugadores en mesa
				function gettpuestos(value, index, array) {
					return value != -1;
				}
				var nplayers = tpuestos.length;						//obtiene el numero de jugadores en mesa
				var iplayer = tpuestos.indexOf(player);				//obtiene el indice en mesa del jugador
				var tpuestos2 = [];									//obtiene la lista de jugadores ordenados: si esta en mesa el orden normalizado
																	//y si no esta en mesa el orden original
				if(iplayer != -1) tpuestos2 = tpuestos.slice(iplayer + 1).concat(tpuestos.slice(0, iplayer));
				else tpuestos2 = tpuestos.slice();
				var tpcoord = [];									//almacena las coordenadas de los jugadores en mesa, usa la funcion para el calculo: si
																	//ya no esta en mesa el numero de jugadores es uno mas que cuando si estoy
				if(iplayer != -1) tpcoord = getpcoods(nplayers);
				else tpcoord = getpcoods(nplayers + 1);
				
				// console.log("nplayers: " + nplayers + " iplayer: " + iplayer + " tpuestos: " + tpuestos + " tpuestos2: " + tpuestos2 + " tpcoord: " 
					// + tpcoord.length);
				
				//loop de jugadores en orden de tpuestos2
				for(i = 0; i < tpuestos2.length; i++){
					var ijucoord = tpcoord[i];						//almacena la coordenada del jugador
					var tplay = tpuestos2[i];						//almacena el id del jugador
					
					//jugadores
					if(juego['estado'] == 1 || juego['estado'] == 2 || juego['estado'] == 3 || juego['estado'] == 4 || juego['estado'] == 5
						|| juego['estado'] == 6 || juego['estado'] == 7){
						context.drawImage(juego[tplay].isman ? img_jugadorm1 : img_jugadorw1, ijucoord.x * a, ijucoord.y * l, 100 * a, 100 * l);
					}
					
					//jugadores nombres
					if(juego['estado'] == 1 || juego['estado'] == 2 || juego['estado'] == 3 || juego['estado'] == 4 || juego['estado'] == 5 
						|| juego['estado'] == 6 || juego['estado'] == 7){
						context.font = "15px Comic Sans MS";
						context.fillStyle = (tplay == juego['turno'])?"cyan":"yellow";
						context.textAlign = "center";
						context.fillText(juego[tplay].nombre, (ijucoord.x + 50) * a, (ijucoord.y - 10) * l);		
					}
					
					//jugadores fichas
					if(juego['estado'] == 2 || juego['estado'] == 3 || juego['estado'] == 4 || juego['estado'] == 5 || juego['estado'] == 6 || juego['estado'] == 7){
						for(var j = 0; j < juego[tplay].fichas; j++){
							context.drawImage(img_fichas, (ijucoord.x + 24 + 20 * j) * a, (ijucoord.y + 140) * l, 15 * a, 15 * l);
						}
					}
					
					//jugadores cartas en reverso
					if(juego['estado'] == 2 || juego['estado'] == 3 || ((juego['estado'] == 4 || juego['estado'] == 5) && !juego[tplay].bajado)){
						for(var k = 0; k < juego[tplay].cartas.length; k++){
							context.drawImage(img_cartatapada, (ijucoord.x + 24 + 10 * k) * a, (ijucoord.y + 85 + 3 * k) * l, 30 * a, 45 * l);
							context.strokeRect((ijucoord.x + 24 + 10 * k) * a, (ijucoord.y + 85 + 3 * k) * l, 30 * a, 45 * l);
						}
					}
					
					//jugadores cartas en anverso
					if(juego[tplay].bajado){
						for(var ii = 0; ii < juego[tplay].cartas.length; ii++){
							var lastcardxcoord = ijucoord.x - 4 + 20 * ii;
							if(ii == 3) lastcardxcoord = ijucoord.x - 4;
							context.drawImage(img_cartaabierta, 30 + (juego[tplay].cartas[ii]%13) * 390, 30 + Math.floor(juego[tplay].cartas[ii]/13) * 570, 360,
								540, lastcardxcoord * a, (ijucoord.y + 7 + 30 * ii) * l, 60 * a, 80 * l);
						}
					}
				}
				
				//boton start
				if(juego['estado'] == 1 && player == 0){
					//boton start
					context.drawImage(img_boton, 20 * a, 18 * l, 100 * a, 36 * l);
					
					//boton start texto
					context.font = "20px Arial";
					context.fillStyle = "black";
					context.textAlign = "center";
					context.strokeText("Start", 70 * a, 41 * l);

					//listener boton start
					if(stats[0] && nplayers > 1){
						canvas.addEventListener('click', functionstart, false);
						//Binding the click event on the canvas
						function functionstart(evt) {
							var mousePos = getMousePos(canvas, evt);
							if (isInside(mousePos,[20 * a, 18 * l, 100 * a, 36 * l])) {
								console.log("enviado click: started");
								socket.emit('message', 'started');
								canvas.removeEventListener('click', functionstart);							
							}  
						}
						stats[0] = false;
					}		
				}
				
				//boton bajarse
				if(juego['estado'] == 3 && player == juego['turno']){
					//boton bajarse
					context.drawImage(img_boton, 20 * a, 446 * l, 100 * a, 36 * l);
					
					//boton bajarse texto
					context.font = "20px Arial";
					context.fillStyle = "black";
					context.textAlign = "center";
					context.strokeText("Bajarse", 70 * a, 469 * l);
				}
				
				//boton continua
				if(juego['estado'] == 6 && player == 0){
					//boton continua
					context.drawImage(img_boton, 20 * a, 18 * l, 100 * a, 36 * l);
					
					//boton continua texto
					context.font = "20px Arial";
					context.fillStyle = "black";
					context.textAlign = "center";
					context.strokeText("Continua", 70 * a, 41 * l);

					//listener boton continua
					if(stats[5]){
						canvas.addEventListener('click', functioncontinua, false);
						//Binding the click event on the canvas
						function functioncontinua(evt) {
							var mousePos = getMousePos(canvas, evt);
							if (isInside(mousePos,[20 * a, 18 * l, 100 * a, 36 * l])) {
								console.log("enviado click: continua");
								socket.emit('message', 'continua');
								canvas.removeEventListener('click', functioncontinua);							
							}  
						}
						stats[5] = false;
					}		
				}
				
				//boton final
				if(juego['estado'] == 7 && player == 0){
					//boton final
					context.drawImage(img_boton, 20 * a, 18 * l, 100 * a, 36 * l);
					
					//boton final texto
					context.font = "20px Arial";
					context.fillStyle = "black";
					context.textAlign = "center";
					context.strokeText("Final", 70 * a, 41 * l);

					//listener boton final
					if(stats[6]){
						canvas.addEventListener('click', functionrestart, false);
						//Binding the click event on the canvas
						function functionrestart(evt) {
							var mousePos = getMousePos(canvas, evt);
							if (isInside(mousePos,[20 * a, 18 * l, 100 * a, 36 * l])) {
								console.log("enviado click: final");
								socket.emit('message', 'final');
								canvas.removeEventListener('click', functionrestart);							
							}  
						}
						stats[6] = false;
					}		
				}
				
				//listeners estado 2 (mesa tapada y mesa abierta)
				if(juego['estado'] == 2 && player == juego['turno']){					
					if(stats[1]){
						canvas.addEventListener('click', functionstat2, false);
						//Binding the click event on the canvas
						function functionstat2(evt) {
							var mousePos = getMousePos(canvas, evt);
							if (isInside(mousePos,[315 * a, 247 * l, 70 * a, 90 * l]) && juego['mesatapada'].length > 0) {
								console.log("enviado click: mesatapada");
								socket.emit('message', 'mesatapada');
								canvas.removeEventListener('click', functionstat2);		
							}  
							if (isInside(mousePos,[415 * a, 247 * l, 70 * a, 90 * l]) && juego['mesaabierta'].length > 0) {
								console.log("enviado click: mesaabierta");
								socket.emit('message', 'mesaabierta');
								canvas.removeEventListener('click', functionstat2);		
							}
						}
						stats[1] = false;
					}
				}
				
				//listeners estado 3 (mis cartas y boton bajarse)
				if(juego['estado'] == 3 && player == juego['turno']){
					if(stats[2]){
						canvas.addEventListener('click', functionstat3, false);
						//Binding the click event on the canvas
						function functionstat3(evt) {
							var mousePos = getMousePos(canvas, evt);
							for(i = 0; i < juego[player].cartas.length; i++){
								if (isInside(mousePos,[(280 + 80 * i) * a, 430 * l, 70 * a, 90 * l])) {
									console.log("enviado click: micarta" + i);
									socket.emit('message', 'micarta' + i);
									canvas.removeEventListener('click', functionstat3);
								} 
							}	
							if (isInside(mousePos,[20 * a, 446 * l, 100 * a, 36 * l])) {
								console.log("enviado click: bajarse");
								socket.emit('message', 'bajarse');
								canvas.removeEventListener('click', functionstat3);							
							}  				
						}
						stats[2] = false;
					}
				}
				
				//listeners estado 4 (mis cartas)
				if(juego['estado'] == 4 && player == juego['turno']){
					if(stats[3]){
						canvas.addEventListener('click', functionstat4, false);
						//Binding the click event on the canvas
						function functionstat4(evt) {
							var mousePos = getMousePos(canvas, evt);
							for(i = 0; i < juego[player].cartas.length; i++){
								if (isInside(mousePos,[(280 + 80 * i) * a, 430 * l, 70 * a, 90 * l])) {
									console.log("enviado click: micartab" + i);
									socket.emit('message', 'micartab' + i);
									canvas.removeEventListener('click', functionstat4);
								} 
							}				
						}
						stats[3] = false;
					}
				}
				
				//listeners estado 5 (mesa tapada y mesa abierta)
				if(juego['estado'] == 5 && player == juego['turno']){
					if(stats[4]){
						canvas.addEventListener('click', functionstat5, false);
						//Binding the click event on the canvas
						function functionstat5(evt) {
							var mousePos = getMousePos(canvas, evt);
							if (isInside(mousePos,[315 * a, 247 * l, 70 * a, 90 * l]) && juego['mesatapada'].length > 0) {
								console.log("enviado click: mesatapadab");
								socket.emit('message', 'mesatapadab');
								canvas.removeEventListener('click', functionstat5);		
							}  
							if (isInside(mousePos,[415 * a, 247 * l, 70 * a, 90 * l]) && juego['mesaabierta'].length > 0) {
								console.log("enviado click: mesaabiertab");
								socket.emit('message', 'mesaabiertab');
								canvas.removeEventListener('click', functionstat5);		
							}
						}
						stats[4] = false;
					}
				}
				
				console.log("juego: (estado: " + juego['estado'] + " pozo: " + juego['pozo'] + " puestos: " + juego['puestos'] + " mesatapada: " + juego['mesatapada'] 
					 + " mesaabierta: " + juego['mesaabierta'] + " quienbaraja: " + juego['quienbaraja'] + " turno: " + juego['turno'] + " batatazo: " + juego['batatazo'] 
					 + " is31: " + juego['is31'] + " ganador: " + juego['ganador'] + " perdedor: " + juego['perdedor'] + " estadotext: " + juego['estadotxt'] 
					 + ") jugador: (socket: " + juego[player].socketid + " dinero: " + juego[player].dinero + " fichas: " + juego[player].fichas 
					 + " cartas: " + juego[player].cartas + " nombre: " + juego[player].nombre + " isman: " + juego[player].isman + " bajado: " + juego[player].bajado 
					 + ") posiciones: (orden natural: " + tpuestos + " jugadores: " + nplayers + " orden normalizado: " + tpuestos2 +")");
			});	
			
			socket.on('desconectar', (msj) => {				
				juegoestado = 1;
				treintayunoForm.style.display = "";	
			});	
			
			socket.emit('new player',player);
			break;

		case 1:		
			treintayunoForm.style.display = "none";	
			socket.connect();
			socket.emit('new player',player);
			console.log(socket);
			break;
		default:
	}
});	



//funcion que retorna las coordenadas normalizadas en base al numero de jugadores en mesa
function getpcoods(fnplayers){
	switch(fnplayers){
		case 2:
			return [pcoord[0]];
		case 3:
			return [pcoord[0],pcoord[1]];
		case 4:
			return [pcoord[2],pcoord[0],pcoord[1]];
		case 5:
			return [pcoord[2],pcoord[0],pcoord[1],pcoord[3]];
		case 6:
			return [pcoord[4],pcoord[2],pcoord[0],pcoord[1],pcoord[3]];
		case 7:
			return [pcoord[4],pcoord[2],pcoord[0],pcoord[1],pcoord[3],pcoord[5]];
	}
	return [];
}

//Funciones del listener de clicks de botones
//Function to get the mouse position
function getMousePos(canvas, event) {
	var rect = canvas.getBoundingClientRect();
	return {
		x: event.clientX - rect.left,
		y: event.clientY - rect.top
	};
}
//Function to check whether a point is inside a rectangle
function isInside(pos,brect){	
	return pos.x > brect[0] && pos.x < brect[0]+brect[2] && pos.y < brect[1]+brect[3] && pos.y > brect[1]
}

//variable de coordenadas de sillas
var pcoord = [	
	{x: 283, y: 55},
	{x: 419, y: 55},
	{x: 118, y: 99},
	{x: 582, y: 99},	
	{x: 90, y: 290},
	{x: 620, y: 290}	
];

function setCookie(cname, cvalue, exdays) {
	var d = new Date();
	d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
	var expires = "expires=" + d.toUTCString();
	document.cookie = cname + "=" + cvalue + ";" + expires;
}

function getCookie(cname) {
	var name = cname + "=";
	var ca = document.cookie.split(';');
	for (var i = 0; i < ca.length; i++) {
		var c = ca[i];
		while (c.charAt(0) == ' ') {
			c = c.substring(1);
		}
		if (c.indexOf(name) == 0) {
			return c.substring(name.length, c.length);
		}
	}
	return "";
}