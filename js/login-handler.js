import { loginEmail, loginGoogle, loginFacebook } from "./auth.js";

document.querySelector("#googleLogin").onclick = loginGoogle;
document.querySelector("#facebookLogin").onclick = loginFacebook;

document.querySelector("#loginForm").onsubmit = async (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const pass = e.target.password.value;

    try {
        await loginEmail(email, pass);
        location.href = "index.html"; 
    } catch (err) {
        alert("Erro ao entrar: " + err.message);
    }
};
