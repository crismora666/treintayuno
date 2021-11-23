const agregarForm = document.getElementById("agregar");
const borrarForm = document.getElementById("borrar");
const dardineroForm = document.getElementById("dardinero");
const resetearForm = document.getElementById("resetear");
const playersSelect = document.getElementById("players");
const dineroSelect = document.getElementById("players2");
// console.log(agregarForm);

//Funcion para solicitar al server los jugadores en db
const loadplayers = () => {
  fetch("/players")
  	.then(response => response.json()) // parse the JSON from the server
  	.then(players => {
  		// console.log(players);
      //para agregar
      var free_id = 0;
      //para borrar
      playersSelect.options.length = 0;
      //para dardinero
      dineroSelect.options.length = 0;
      //------
      players.forEach((item, index) => {
        //para agregar
        free_id = Math.max(free_id, item[0]);
        //para borrar
        appendNewPlayer(item,0);
        //para dardinero
        appendNewPlayer(item,1);
      });
      //------
      //para agregar
      free_id += 1;
      document.getElementById("addid").value= free_id;
  });
}

loadplayers();

agregarForm.addEventListener("submit", event => {
	event.preventDefault();
  var formData = new FormData(event.target);
  agregarData = {};
  agregarData["addid"] = formData.get("addid");
  agregarData["addname"] = formData.get("addname");
  agregarData["addveces"] = formData.get("addveces");
  agregarData["adddinero"] = formData.get("adddinero");
  agregarData["addeshombre"] = formData.get("addeshombre");
  let config = {
    method: "POST",
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(agregarData)
  }
  fetch("/adminagregar", config)
    .then(response => response.json())
    .then(result => {
      console.log(result.resultado);
      if(result.resultado == "exito"){
        loadplayers();
        enExito();
      }
    });
});

borrarForm.addEventListener("submit", event => {
	event.preventDefault();
  var formData = new FormData(event.target);
  borrarData = {};
  borrarData["p"] = formData.get("p");
  let config = {
    method: "POST",
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(borrarData)
  }
  fetch("/adminborrar", config)
    .then(response => response.json())
    .then(result => {
      console.log(result.resultado);
      if(result.resultado == "exito"){
        loadplayers();
        enExito();
      }
    });
});

dardineroForm.addEventListener("submit", event => {
	event.preventDefault();
  var formData = new FormData(event.target);
  dardineroData = {};
  dardineroData["p"] = formData.get("p2");
  dardineroData["dinero"] = formData.get("masdinero");
  let config = {
    method: "POST",
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(dardineroData)
  }
  fetch("/admindardinero", config)
    .then(response => response.json())
    .then(result => {
      console.log(result.resultado);
      if(result.resultado == "exito"){
        loadplayers();
        enExito();
      }
    });
});

resetearForm.addEventListener("submit", event => {
	event.preventDefault();
  fetch("/adminresetear")
    .then(response => response.json())
    .then(result => {
      console.log(result.resultado);
      if(result.resultado == "exito"){
        enExito();
      }
    });
});

//Funcion que crea una opccion del select
function appendNewPlayer(plyrdb,selElement) {
	const newOptionItem = document.createElement("option");
	newOptionItem.value = plyrdb[0];
	newOptionItem.innerText = plyrdb[1];
  switch(selElement){
    case 0:
      playersSelect.appendChild(newOptionItem);
      break;
    case 1:
      dineroSelect.appendChild(newOptionItem);
      break;
  }
}

function enExito() {
  var x = document.getElementById("snackbar");
  x.className = "show";
  setTimeout(function(){ x.className = x.className.replace("show", ""); }, 3000);
}
