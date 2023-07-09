//Importacion JWT
import jwt from 'jsonwebtoken'
//Importamos el modelo 
import Veterinario from '../models/Veterinario.js'

//Definir la funcion para validar el JWT
const verificarAutenticacion = async (req,res,next)=>{

if(!req.headers.authorization) return res.status(404).json({msg:"Lo sentimos, debes proprocionar un token"})    
    const {authorization} = req.headers
    try {
        const {id} = jwt.verify(authorization.split(' ')[1],process.env.JWT_SECRET)
        req.veterinarioBDD = await Veterinario.findById(id).lean().select("-password")
        next()
    } catch (error) {
        const e = new Error("Formato del token no válido")
        return res.status(404).json({msg:e.message})
    }
}

export default verificarAutenticacion