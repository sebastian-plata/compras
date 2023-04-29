//importa el módulo express de express
const express = require("express");

//importa el módulo session de express-session
const session = require("express-session");

//importa el módulo body-parser de body-parser
const bodyParser = require("body-parser");

//importa los módulos del fichero de configuración de la base de datos
const {
  read,
  create,
  updateState,
  updateText,
  removeItem,
} = require("./dataBase/config");

//asigna express a la constante 'server'
const server = express();

//array de objetos con los datos de inicio de sesión
let sesiones = [
  { user: "root", pass: "c3b0l1a" },
  { user: "juans", pass: "4naK4Rd0" },
  { user: "prof", pass: "m4Ng0b1Ch3" },
];

//constante de mensaje de error
const failMsg = { result: "fatal-error" };

//vincula el directorio "/views" con el view engine de ejs
server.set("view engine", "ejs");

//recibe y hace "parse" a las peticiones que viajan a través de la url
server.use(bodyParser.urlencoded({ extended: true }));

// MIDDLEWARES

server.use(
  //objeto con la información de la sesión del usuario que  se ha conectado. Este objeto esta creado dentro de la petición y esta ligado al ordenador desde el que se ha hecho la petición
  session({
    //un string en base al que SESSION generara una encriptacion
    secret: "seed",
    //cada vez que hay un cambio en la SESSION esta se vuelve a guardar
    resave: true,
    //cualquier SESSION a la que no le hayan cambiado nada NO se guarda
    saveUninitialized: false,
  })
);

//middleware que hace render al index.ejs
server.get("/", (req, res) => {
  //si existe el objeto usuario dentro de la session, renderiza el index.ejs. La propiedad "session" dentro de la petición la crea el middleware anterior "server.use(session({...}))"
  if (req.session.user) {
    //desestructuración del objeto session para obtener el nombre de usuario, "user"
    let { user } = req.session.user;
    //retorna el render de index.ejs y envía el valor de "user" del objeto de la petición
    return res.render("index", { user });
  }
  //caso contrario redirecciona a login
  res.redirect("/login");
});

//middleware que hace render al login.ejs
server.get("/login", (req, res) => {
  //si no existe la sesión del usuario
  if (!req.session.user) {
    //se renderiza el "/login" con "error" = "false", de modo que no se renderice el párrafo con el mensaje de error
    return res.render("login", { error: false });
  }
  //caso contrario, es decir sí si existe la sesión del usuario, se rederige al index
  res.redirect("/");
});

//middleware de método "POST" para "/login"
server.post("/login", (req, res) => {
  //se recorre el array de objetos "sesiones" donde están almacenados los datos de inicio de sesión
  sesiones.forEach((sesion, index) => {
    //primera comprobación, se pregunta sí el valor de la propiedad "user" del cuerpo de la petición coincide con el valor de la propiedad "user" de alguno de los objetos del array "sesiones"
    if (req.body.user == sesiones[index].user) {
      //segunda comprobación, se pregunta sí el valor de la propiedad "pass" del cuerpo de la petición coincide con el valor de la propiedad "pass" de alguno de los objetos del array "sesiones"
      if (req.body.pass == sesiones[index].pass) {
        //sí se cumple asigna los valor del objeto dentro del array "sesiones" (es decir, los datos de inicio de sesión) a la "session". Efectivamente iniciando sesión
        req.session.user = sesiones[index];
        //redirecciona a la url "/", o sea al index.ejs
        return res.redirect("/");
      }
    }
  });
  //si algo de lo anterior falla "error" será "true" y el párrafo con el mensaje de error se renderiza en la plantilla
  res.render("login", { error: true });
});

//middleware para destruir la sesión. utiliza la url "/logout"
server.get("/logout", (req, res) => {
  //el método "destroy()" se usa para cerrar ("DESTRUIR!") una sesión que esté activa. El método recibe un callback
  req.session.destroy(() => {
    //en el "callback", cuando la sesión es destruida, se hace redirección al "/login"
    res.redirect("/login");
  });
});

/*permisos de CORS mientras se desarrolla en Vite
  server.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "content-type");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE");
  next();
});  */

//crea la propiedad "body" para cualquier petición que entre con "Content-type" : "application/json" 
server.use(bodyParser.json());

//middleware de pruebas
//server.use("/test", express.static("./test"));

//middleware para el front hecho en react
server.use("/compras-react", express.static("./compras-react"));

//chaining the CRUD
server
  //"route()" es un método que permite encadenar cada uno de los "endpoints" del CRUD
  .route("/compras")
  //iniciando con la petición de tipo "GET" que, como el resto de los "endpoints" recibe como argumentos la petición (request, req), la respuesta (response,res) y un callback. Este endpoint "GET" pinta TODOS los elementos de la lista
  .get(async (req, res) => {
    //en este caso creamos un arreglo de variables una para gestionar el "error" y la otra para los artículos de la "lista" que se van a pintar. Al ser una petición asíncrona la resolución de estás variables dependerá del resultado de la consulta a la base de datos
    let [error, lista] = await read();
    //si la consulta NO tiene error (!error) entonces pintara los elementos de la lista, caso contrario arrojará el objeto "failMsg" como un string JSON como mensaje de error
    res.json(!error ? lista : failMsg);
  })
  .post(async (req, res) => {
    //en este "endpoint" de método "POST" se gestiona la creación de nuevos artículos en la lista de la base de datos. Para ello se recibe, desestructurado, la propiedad artículo del objeto de la consulta. Accediendo a él gracias al body-parser
    let { articulo } = req.body;
    //se evalua entonces si el artículo existe y si, al remover los caractéres vacíos, no es un string vacío
    if (articulo && articulo.trim() != "") {
      //sí lo anterior se cumple se llamará a la función "create" luego de esperar que se resuelva la consulta. La función tendrá como argumento el valor de la propiedad "articulo" del cuerpo de la petición SIN caractéres vacíos
      let [error, answer] = await create(articulo.trim());
      //sí no hay error...
      if (!error) {
        //creamos el objeto "outcome" que tendrá como objetivo manejar el resultado de la consulta
        let outcome = { result: "error" };
        //"affectedRows" es la propiedad que determina si un articulo se ha agregado a la "lista". Por tanto, se usa como criterio de comprobación
        if (answer.affectedRows > 0) {
          //cambiamos el valor de la propiedad result por "success" para indicar el éxito de la consulta, si affectedRows > 0
          outcome.result = "success";
          //agregamos la propiedad id al objeto "outcome" cuyo valor será igual al id del objeto resultado de la petición
          outcome.id = answer.insertId;
        }
        //retorna el objeto "outcome" como string JSON
        return res.json(outcome);
      }
    }
    //si la primera comprobación falla --> mensaje de error
    res.json(failMsg);
  })
  .put(async (req, res) => {
    //el "endpoint" con el método "PUT" gestiona las actualizaciones de los artículos de la lista. El cuerpo de la petición será un objeto con las propiedades id : id del árticulo, action : propiedad que define qué tipo de cambio se va a hacer, articulo : nombre del artículo
    let { id, action, articulo } = req.body;
    //la primera comprobación se hace mediante el método "test()" de las expresiones regulares con la que se verifica que tanto el "id" como la action sean válidos. El "id" es un número entero de hasta 11 cifras, mientras que "action" solo puede tomar los valores 1 o 2
    if (id && /^\d{1,11}$/.test(id) && action && /^(1|2)$/.test(action)) {
      //se crea una variable array para guardar las funciones que se encargan de cambiar tanto el estado del artículo (comprado: 1|0) como de cambiar el texto/nombre del artículo. updateState y updateText, respectivamente
      let actions = [updateState, updateText];
      //adicionalmente se crea una variable que gestionará la consulta a la base de datos como tal
      let inquiry = true;
      //type-casting de la propiedad "action". Esto se hace para comodidad en el código y no estar escribiendo "parsenInt(action)" repetidas veces
      action = parseInt(action);
      //comprobación, si action es igual a 2, es decir, si lo que se va a cambiar es el texto
      if (action == 2) {
        //a "inquiry" se le asigna el valor de la propiedad "articulo" (el nombre, si existe) y se pregunta si "articulo" es distinto de un string vacío
        inquiry = articulo && articulo != "";
      }
      //luego, preguntamos por el valor booleano de "inquiry" que de ser "true" (significa que las condiciones anteriores, relacionadas a "articulo", también son "true")
      if (inquiry) {
        //sí se cumple, entonces se hara un llamado a cualquiera de las funciones contenidas en el array "actions". Estas reciben como argumento el "id" y sí action es distinto de 1, o sea 2, también recibirá la propiedad articulo, lo que permitirá cambiar el nombre del artículo. Caso contrario, es decir si action == 1, entonces solo recibirá el "id"
        let [error, answer] = await actions[action - 1](
          id,
          action != 1 ? articulo : null
        );
        //si no hay error...
        if (!error) {
          //se retorna la respuesta JSON que tomará valor de acuerdo a una propiedad del objeto que devuelve la consulta. Si changedRows, la propiedad que indica que un elemento de la tabla ha sido actualizado, es mayor que 0 entonces será exitosa, caso contrario "error"
          return res.json({
            result: answer.changedRows > 0 ? "success" : "error",
          });
        }
      }
    }
    //si el "id" o la "action" tienen valores inválidos ---> fatal-error!
    res.json(failMsg);
  });

//leer UN SOLO artículo de la "lista". Es por eso que, a diferencia del anterior "endpoint" "GET" este recibe un prefijo extra en la url en el que se le ingresa el "id" del artículo que se va a consultar
server.get("/compras/:id([0-9]{1,11})", async (req, res) => {
  //se crea una variable array que contiene el error y el artículo de la consulta y ambos dependerán de la consulta "GET" a través de la función read que recibe en sus argumentos el "id" del objeto de la petición
  let [error, articulo] = await read(req.params.id);
  //sí no hay error pinta el objeto del artículo como un string JSON, caso contrario mensaje de error
  res.json(!error ? articulo : failMsg);
});

//borrar un artículo de la "lista". Este "endpoint" tiene 2 prefijos añadidos a la url: "/borrar" e "/:id". Esto por seguridad cuando se van a eleminar entradas de la tabla de la base de datos (que no queremos borrar todo por error)
server.delete("/compras/borrar/:id([0-9]{1,11})", async (req, res) => {
  //igual al "endpoint" anterior, este también requiere el "id" del objeto de la petición como argumento en la función, en este caso, "removeItem"
  let [error, answer] = await removeItem(req.params.id);
  //sí no hay error...
  if (!error) {
    //retornará "success" si "affectedRows" la propiedad del objeto que devuelve la consulta que indica que se, efectivamente, se ha borrado un registro, es mayor que 0. Caso contrario "error"
    return res.json({ result: answer.affectedRows > 0 ? "success" : "error" });
  }
  //si falla la primera comprobación de error: fatal-error!
  res.json(failMsg);
});

//error general en la API
server.use((error, req, res, next) => {
  res.json(failMsg);
});

//para todo lo demás existe este middleware
server.use((req, res) => {
  res.json(failMsg);
});

//indica el puerto en el que 'escucha' el server
server.listen(3000);
