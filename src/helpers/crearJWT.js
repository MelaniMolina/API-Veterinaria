//Importacion del JWT
import jwt from "jsonwebtoken";

//Definir la funcion para generar Token
const generarJWT = (id)=>{
    return jwt.sign({id},process.env.JWT_SECRET,{expiresIn:"1d"})
}

//Exportacion por Default de la funcion 
export default  generarJWT