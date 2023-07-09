import Veterinario from "../models/Veterinario.js"
import { sendMailToUser, sendMailToRecoveryPassword } from "../config/nodemailer.js"
import generarJWT from "../helpers/crearJWT.js"
import mongoose from "mongoose"

const login = async(req,res)=>{
    //Capturar los datos del requets
    const {email,password} = req.body
    //Validacion de campos vacios
    if (Object.values(req.body).includes("")) return res.status(404).json({msg:"Lo sentimos, debes llenar todos los campos"})
    //Obtener el usuario en base al email
    const veterinarioBDD = await Veterinario.findOne({email}).select("-status -__v -token -updatedAt -createdAt")
    //Validacion de la cuenta del email
    if(veterinarioBDD?.confirmEmail===false) return res.status(403).json({msg:"Lo sentimos, debe verificar su cuenta"})
    //Validar si existe el usuario 
    if(!veterinarioBDD) return res.status(404).json({msg:"Lo sentimos, el usuario no se encuentra registrado"})
    //Verificar si el password del request es el mismo de la BDD
    const verificarPassword = await veterinarioBDD.matchPassword(password)
    if(!verificarPassword) return res.status(404).json({msg:"Lo sentimos, el password no es el correcto"})
    const token = generarJWT(veterinarioBDD._id)
    //Destructurar la informacion del usuario 
    const {nombre,apellido,direccion,telefono,_id} = veterinarioBDD
    //Presentar los datos 
    res.status(200).json({
        token,
        nombre,
        apellido,
        direccion,
        telefono,
        _id,
        email:veterinarioBDD.email
    })
}



const perfil =(req,res)=>{
    delete req.veterinarioBDD.token
    delete req.veterinarioBDD.confirmEmail
    delete req.veterinarioBDD.createdAt
    delete req.veterinarioBDD.updatedAt
    delete req.veterinarioBDD.__v
    res.status(200).json(req.veterinarioBDD)
}


const registro = async (req,res)=>{
    //Capturamos lo datos BDD
    const {email,password} = req.body
    //Validacion de espacios vacios
    if (Object.values(req.body).includes("")) return res.status(400).json({msg:"Lo sentimos, debes llenar todos los campos"})
    const verificarEmailBDD = await Veterinario.findOne({email})
    if(verificarEmailBDD) return res.status(400).json({msg:"Lo sentimos, el email ya se encuentra registrado"})
    //Crear la instancia del modelo
    const nuevoVeterinario = new Veterinario(req.body)
   //Encriptar el usuario para el password 
    nuevoVeterinario.password = await nuevoVeterinario.encrypPassword(password)
    //Crear el token del usuario
    const token = nuevoVeterinario.crearToken()
    //Invocar la funcion para el envio del correo
    await sendMailToUser(email,token)
    //Guradar en BDD
    await nuevoVeterinario.save()
    //Respuesta al usuario 
    res.status(200).json({msg:"Revisa tu correo electrónico para confirmar tu cuenta"})
}



const confirmEmail = async (req,res)=>{
    //Validar el token del correo 
    if(!(req.params.token)) return res.status(400).json({msg:"Lo sentimos, no se puede validar la cuenta"})
    //Verificar si en base al token existe ese usuario 
    const veterinarioBDD = await Veterinario.findOne({token:req.params.token})
    //Validar si el token ya fue seteado a null
    if(!veterinarioBDD?.token) return res.status(404).json({msg:"La cuenta ya ha sido confirmada"})
    //Setear a null token
    veterinarioBDD.token = null
    //Cambiar a true la confirmacion de la cuenta 
    veterinarioBDD.confirmEmail=true
    //Guradar cambios en la base de datos 
    await veterinarioBDD.save()
    //Presentar mensajes al usuario 
    res.status(200).json({msg:"Token confirmado, ya puedes iniciar sesión"}) 
}





const listarVeterinarios = (req,res)=>{
    res.status(200).json({res:'lista de veterinarios registrados'})
}


const detalleVeterinario = async(req,res)=>{
    //Obtenemos los datos por medio de params
    const {id} = req.params
    //Validar ID
    if( !mongoose.Types.ObjectId.isValid(id) ) return res.status(404).json({msg:`Lo sentimos, debe ser un id válido`});
    //Obtener el usuario en base a la ID
    const veterinarioBDD = await Veterinario.findById(id).select("-password")
    //Validar si existe el usuario 
    if(!veterinarioBDD) return res.status(404).json({msg:`Lo sentimos, no existe el veterinario ${id}`})
    //Mostrar datos al usuario 
    res.status(200).json({msg:veterinarioBDD})
}



const actualizarPerfil = async (req,res)=>{
    const {id} = req.params
    if( !mongoose.Types.ObjectId.isValid(id) ) return res.status(404).json({msg:`Lo sentimos, debe ser un id válido`});
    if (Object.values(req.body).includes("")) return res.status(400).json({msg:"Lo sentimos, debes llenar todos los campos"})
    const veterinarioBDD = await Veterinario.findById(id)
    if(!veterinarioBDD) return res.status(404).json({msg:`Lo sentimos, no existe el veterinario ${id}`})
    if (veterinarioBDD.email !=  req.body.email)
    {
        const veterinarioBDDMail = await Veterinario.findOne({email:req.body.email})
        if (veterinarioBDDMail)
        {
            return res.status(404).json({msg:`Lo sentimos, el existe ya se encuentra registrado`})  
        }
    }
		veterinarioBDD.nombre = req.body.nombre || veterinarioBDD?.nombre
    veterinarioBDD.apellido = req.body.apellido  || veterinarioBDD?.apellido
    veterinarioBDD.direccion = req.body.direccion ||  veterinarioBDD?.direccion
    veterinarioBDD.telefono = req.body.telefono || veterinarioBDD?.telefono
    veterinarioBDD.email = req.body.email || veterinarioBDD?.email
    await veterinarioBDD.save()
    res.status(200).json({msg:"Perfil actualizado correctamente"})
}

const actualizarPassword = async (req,res)=>{
    const veterinarioBDD = await Veterinario.findById(req.veterinarioBDD._id)
    if(!veterinarioBDD) return res.status(404).json({msg:`Lo sentimos, no existe el veterinario ${id}`})
    const verificarPassword = await veterinarioBDD.matchPassword(req.body.passwordactual)
    if(!verificarPassword) return res.status(404).json({msg:"Lo sentimos, el password actual no es el correcto"})
    veterinarioBDD.password = await veterinarioBDD.encrypPassword(req.body.passwordnuevo)
    await veterinarioBDD.save()
    res.status(200).json({msg:"Password actualizado correctamente"})
}


const recuperarPassword = async(req,res)=>{
    //Capturar el email del request
    const {email} = req.body
    //Validacion de campos vacios
    if (Object.values(req.body).includes("")) return res.status(404).json({msg:"Lo sentimos, debes llenar todos los campos"})
    //Obtener el usuario en base al email
    const veterinarioBDD = await Veterinario.findOne({email})
    //Validacion de la existencia del usuario 
    if(!veterinarioBDD) return res.status(404).json({msg:"Lo sentimos, el usuario no se encuentra registrado"})
    //Crear el token
    const token = veterinarioBDD.crearToken()
    //Establecer el token en el usuario obtenido previamente 
    veterinarioBDD.token=token
    //Enviar el email de recuperacion
    await sendMailToRecoveryPassword(email,token)
    //Guradar los cambios en la BDD
    await veterinarioBDD.save()
    //Presentar mensajes al usuario 
    res.status(200).json({msg:"Revisa tu correo electrónico para reestablecer tu cuenta"})
}




const comprobarTokenPasword = async (req,res)=>{
    //Validar el token
    if(!(req.params.token)) return res.status(404).json({msg:"Lo sentimos, no se puede validar la cuenta"})
    //Obtener el usuario en base al token
    const veterinarioBDD = await Veterinario.findOne({token:req.params.token})
    //Validacion de la existencia del usuario 
    if(veterinarioBDD?.token !== req.params.token) return res.status(404).json({msg:"Lo sentimos, no se puede validar la cuenta"})
    //Guardar datos en la BDD
    await veterinarioBDD.save()
    //Presentar los mensajes al usuario 
    res.status(200).json({msg:"Token confirmado, ya puedes crear tu nuevo password"}) 
}


const nuevoPassword = async (req,res)=>{
    //Obtener el nuevo password y la confirmacion del resquest
    const{password,confirmpassword} = req.body
    //Validacion de campos vacios 
    if (Object.values(req.body).includes("")) return res.status(404).json({msg:"Lo sentimos, debes llenar todos los campos"})
    //Validacion de coincideencia del password 
    if(password != confirmpassword) return res.status(404).json({msg:"Lo sentimos, los passwords no coinciden"})
      //Obtener los datos del usuario en base al token
    const veterinarioBDD = await Veterinario.findOne({token:req.params.token})
    //Validar la existencia del usuario 
    if(veterinarioBDD?.token !== req.params.token) return res.status(404).json({msg:"Lo sentimos, no se puede validar la cuenta"})
    //Setear el token nuevamente a null
    veterinarioBDD.token = null
    //Encriptar el nuevo password
    veterinarioBDD.password = await veterinarioBDD.encrypPassword(password)
    //Guardar en BDD
    await veterinarioBDD.save()
    //Presentar los mensajes al usuario 
    res.status(200).json({msg:"Felicitaciones, ya puedes iniciar sesión con tu nuevo password"}) 
}




//Exportacion Nombrada
export {
    login,
    perfil,
    registro,
    confirmEmail,
    listarVeterinarios,
    detalleVeterinario,
    actualizarPerfil,
    actualizarPassword,
	recuperarPassword,
    comprobarTokenPasword,
	nuevoPassword
}