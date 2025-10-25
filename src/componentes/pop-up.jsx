import { useRef } from "react"
import styles from "./pop-ip.module.css"

export default function PopUp() {
    const popUpRef = useRef(null)
    
    return (
        <div className={styles["pop-up"]} ref={popUpRef}>
            <h1>PopUp</h1>
            <p>AVISO</p>
            <p>Este programa fue desarrollado por el equipo 'RUNNERS' de 1N de la carrera de Ingeniería en Desarrollo de Software de la UNACH.</p>
            <p>El repositorio del backend se encuentra en el siguiente enlace: <a href="https://github.com/k1rie/PL-Simplex-Solver">PROYECTO DE BACKEND</a></p>
            <p>El repositorio del frontend se encuentra en el siguiente enlace: <a href="https://github.com/k1rie/PL-SIMPLEX-FRONTEND">PROYECTO DE FRONTEND</a></p>
            <button onClick={() => popUpRef.current.style.display = 'none'}>Cerrar</button>
        </div>
    )
}