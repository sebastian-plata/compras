//importa el módulo mysql de mysql2
const mysql = require("mysql2/promise");

//funcion de conexion a la base de datos
function connect() {
  //esta función se encarga de establecer la conexión con la base de datos utiliza una declaración "try... catch" para manejar el error en la conexión
  return new Promise(async (callback) => {
    try {
      //se define una variable "connection" que espera a que el módulo mysql se conecte con la base de datos a través de la función "createConnection()", la cual recibe como argumento un objeto de configuración de la base de datos en el que se incluyen las siguientes propiedades
      let connection = await mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "",
        database: "compras",
      });
      //si error == null, la conexión se establecido exitosamente
      callback([null, connection]);
    } catch (error) {
      //si hay error catch responde con el error 
      callback([error]);
    }
  });
}

// CRUD

//función consulta de lectura de los items de la tabla "lista". La función "read" recibe como argumento el "id" del elemento en la tabla "lista" 
function read(id) {
  //la función retorna una promesa que se cumplirá después de esperar a que la conexión con la base de datos se realice con éxito
  return new Promise(async (callback) => {
    let [error, connection] = await connect();
    //sí no hay error...
    if (!error) {
      //se crea una variable donde se deposita la consulta SQL que se hace a la base de datos. Como se necesita que esta función sirva tanto para TODAS como para UN solo elemento de la tabla, se usa un operador ternario para controlar si es uno o TODOS los items de la tabla "lista" en función del argumneto "id"
      let consulta = `SELECT * FROM lista ${id ? "WHERE id = ?" : ""}`;
      //la variable "result" espera a que la consulta sea enviada a la base de datos a través de la función "query" que recibe como argumentos la variable "consulta" y un operador ternario que precisamente define si se trata de TODOS o UNO
      let [result] = await connection.query(consulta, id ? [id] : null);
      //cierra la conexión al finalizar al consulta
      connection.close();
      //como error == null, devuelve el resultado de la consulta
      callback([null, result]);
    } else {
      //si la consulta es invalida o hay un error de conexión con la base de datos salta este error
      callback([{ error: "invalid query or data-base error" }]);
    }
  });
}

//función consulta de creación de nuevos items en la tabla "lista". La función "create" se usa para crear un nuevo registro en al tabla "lista" y recibe como argumento "articulo" el nombre o texto depositado en el input que será enviado a la base de datos en el campo del mismo nombre de la tabla "lista"
function create(articulo) {
  return new Promise(async (callback) => {
    let [error, connection] = await connect();
    if (!error) {
      //en este caso la consulta SQL tiene para "VALUES" un placeholder "(?)" que tomará el valor del argumento "articulo"
      let [result] = await connection.query(
        "INSERT INTO lista (articulo) VALUES (?)",
        [articulo]
      );
      connection.close();
      callback([null, result]);
    } else {
      callback([{ error: "invalid query or data-base error" }]);
    }
  });
}

//función consulta de actualización del estado de los items en la tabla "lista". La función "updateState" actualiza o cambia el estado de los registros de la tabla "lista". Este valor funciona como un booleano aunque en la base de datos está representado por un número (tinyint) en el campo "comprado". Como su nombre indica este estado define si alguno de los artículos de la "lista de compras" ya ha sido comprado
function updateState(id) {
  return new Promise(async (callback) => {
    let [error, connection] = await connect();
    if (!error) {
      //toggle de SQL, se usa la palabra "NOT"
      let [result] = await connection.query(
        //en esta consulta también se usa un placeholder pero este caso es para el "id" del registro. El "id" es el campo/propiedad necesario para saber a cuál registro se le va a cambiar el estado  
        "UPDATE lista SET comprado = NOT comprado WHERE id = ?",
        [id]
      );
      connection.close();
      callback([null, result]);
    } else {
      callback([{ error: "invalid query or data-base error" }]);
    }
  });
}

//función consulta de actualización del texto de los items en la tabla "lista". La función "updateText" se utilizará para cambiar el texto del registro (la propiedad "articulo" del objeto). Esta función recibirá como argumentos tanto el "id" como el "articulo" (nombre del artículo)
function updateText(id, articulo) {
  return new Promise(async (callback) => {
    let [error, connection] = await connect();
    if (!error) {
      let [result] = await connection.query(
        //por lo tanto, en lugar de un placeholder, tiene dos. Los placeholders deben ponerse en el orden que aparecen en la consulta
        "UPDATE lista SET articulo = ? WHERE id = ?",
        [articulo, id]
      );
      connection.close();
      callback([null, result]);
    } else {
      callback([{ error: "invalid query or data-base error" }]);
    }
  });
}

//función consulta de borrado de items en la tabla "lista". La función "removeItem" se encarga de gestionar la eliminación de registros de la tabla "lista". Para saber qué borrar, toma como argumento el "id" del registro
function removeItem(id) {
  return new Promise(async (callback) => {
    let [error, connection] = await connect();
    if (!error) {
      //como en las anteriores, esta consulta utiliza un placeholder al que se le asignará el valor del argumento de la función
      let [result] = await connection.query("DELETE FROM lista WHERE id = ?", [
        id,
      ]);
      connection.close();
      callback([null, result]);
    } else {
      callback([{ error: "invalid query or data-base error" }]);
    }
  });
}

//exporta los módulos para usarlos en index.js
module.exports = { read, create, updateState, updateText, removeItem };
