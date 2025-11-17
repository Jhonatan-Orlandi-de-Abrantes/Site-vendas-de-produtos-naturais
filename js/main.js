const API_URL = "http://localhost:3000"; // 🔧 Trocar ao subir para HTTPS no domínio real

function saveSession(token, user){
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
}

function getToken(){
    return localStorage.getItem("token");
}

function logout(){
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "login.html";
}

async function login(email, password){
    const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if(res.ok){
        saveSession(data.token, data.user);
        window.location.href = "index.html";
    } else {
        alert(data.error || "Erro ao entrar");
    }
}

async function checkAuth(){
    const token = getToken();
    if(!token) return null;

    const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    if(!res.ok){
        logout();
        return null;
    }

    return await res.json();
}

// ========= INTEGRA LOGIN.HTML =========
if(document.getElementById("loginForm")){
    document.getElementById("loginForm").addEventListener("submit", async (e)=>{
        e.preventDefault();
        const form = new FormData(e.target);
        login(form.get("email"), form.get("password"));
    });
}
