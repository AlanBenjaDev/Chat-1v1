import React, { useEffect, useState, useRef } from 'react';

function Home() {
const [usuario, setUsuario] = useState(null);
const [conversaciones, setConversaciones] = useState([]);
const [conversacionId, setConversacionId] = useState(null);
const [mensajes, setMensajes] = useState([]);
const [mensaje, setNuevoMensaje] = useState('');
const [usuario2Id, setUsuario2Id] = useState('');
const [cargandoMasMensajes, setCargandoMasMensajes] = useState(false);
const chatContainerRef = useRef(null);
const token = localStorage.getItem('token');
const conversacionIdRef = useRef(null);

 
useEffect(() => {
conversacionIdRef.current = conversacionId;
}, [conversacionId]);
  
useEffect(() => {
if (chatContainerRef.current) {
chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
}
}, [mensajes]);

 
useEffect(() => {
if (!usuario) return;
const ws = new WebSocket('ws://localhost:3000');
ws.onopen = () => {
console.log('WebSocket conectado');
ws.send(JSON.stringify({ type: 'register', userId: usuario.id }));
};

const handleMessage = (event) => {
try {
const mensajeWS = JSON.parse(event.data);
if (mensajeWS.tipo === 'mensajeNuevo') {
const nuevoMensaje = mensajeWS.data;

setMensajes(prev => {
           
 if (nuevoMensaje.conversacion_id === conversacionIdRef.current) {

const isDuplicate = prev.some(m => m.id === nuevoMensaje.id);
              
if (isDuplicate) {
return prev;
}

const tempMessageIndex = prev.findIndex(m => m.texto === nuevoMensaje.texto && m.usuario_id === nuevoMensaje.usuario_id && !m.id);
if (tempMessageIndex > -1) {
const newMessages = [...prev];
newMessages[tempMessageIndex] = nuevoMensaje;
 return newMessages;
}
return [...prev, nuevoMensaje];
}
return prev;
});
}
} catch (e) {
console.error('Error parsing WS message:', e);
}
};

 ws.onmessage = handleMessage;
return () => ws.close();
}, [usuario]);


useEffect(() => {
if (!token) return;
fetch('http://localhost:3000/api/usuarios/perfil', { headers: { 'Authorization': `Bearer ${token}` }})
.then(res => res.ok ? res.json() : Promise.reject('No autorizado'))
.then(data => setUsuario(data.usuario))
.catch(err => { console.error('Error al cargar perfil:', err); setUsuario(null); });
}, [token]);

useEffect(() => {
 if (!token) return;
fetch('http://localhost:3000/api/chat/conversaciones', { headers: { 'Authorization': `Bearer ${token}` }})
.then(res => res.ok ? res.json() : Promise.reject('No autorizado'))
.then(data => setConversaciones(data))
.catch(err => console.error('Error al cargar conversaciones:', err));
}, [token]);


useEffect(() => {
if (!token || !conversacionId) return;
setMensajes([]);
fetch(`http://localhost:3000/api/chat/mensajes/${conversacionId}`, { headers: { 'Authorization': `Bearer ${token}` }})
.then(res => res.ok ? res.json() : Promise.reject('No autorizado'))
.then(data => setMensajes(Array.isArray(data) ? data.reverse() : []))
 .catch(err => console.error('❌ Error al cargar mensajes:', err));
}, [token, conversacionId]);

const cargarMensajesAntiguos = async () => {
if (cargandoMasMensajes || !conversacionId) return;
setCargandoMasMensajes(true);
try {
const offset = mensajes.length;
const res = await fetch(`http://localhost:3000/api/chat/mensajes/${conversacionId}?offset=${offset}`, {
headers: { 'Authorization': `Bearer ${token}` }
});
if (!res.ok) throw new Error('Error al cargar mensajes antiguos');
const data = await res.json();
setMensajes(prevMensajes => [...data.reverse(), ...prevMensajes]);
} catch (err) {
console.error('Error al cargar mensajes antiguos:', err);
} finally {
setCargandoMasMensajes(false);
}
};

const crearConversacion = async (e) => {
 e.preventDefault();
if (!usuario2Id) return;
try {
const res = await fetch('http://localhost:3000/api/chat/crear-conversacion', {
method: 'POST',
headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json'},
body: JSON.stringify({ usuario2_id: usuario2Id }),
});
if (res.ok) {
const data = await res.json();
setConversacionId(data.conversacion_id);
setUsuario2Id('');
setConversaciones(prev => [...prev, { id: data.conversacion_id, usuario2_id: usuario2Id, nombre_contacto: 'Usuario ' + usuario2Id }]);
} else {
const errorData = await res.json();
alert('❌ Error al crear conversación: ' + (errorData?.mensaje || errorData?.error || ''));
}
} catch (err) {
console.error('❌ Error de conexión:', err);
alert('Error de conexión con el servidor');
}
};

const enviarMensaje = async (e) => {
e.preventDefault();
if (!mensaje.trim() || !conversacionId) {
alert('Primero crea o selecciona una conversación');
return;
}
const tempMensaje = {

conversacion_id: conversacionId,
usuario_id: usuario.id,
autor_mensaje: usuario.username || usuario.user,
texto: mensaje,
fecha_mensaje: new Date().toISOString(),
};
setMensajes(prev => [...prev, tempMensaje]);
setNuevoMensaje('');
try {
const res = await fetch('http://localhost:3000/api/chat/enviar', {
method: 'POST',
headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json'},
body: JSON.stringify({ conversacion: conversacionId, texto: mensaje }),
});
if (!res.ok) {
setMensajes(prev => prev.filter(m => m.texto !== tempMensaje.texto || m.usuario_id !== tempMensaje.usuario_id || m.conversacion_id !== tempMensaje.conversacion_id));
const errorData = await res.json();
alert('❌ Error al enviar mensaje: ' + (errorData?.error || ''));
}
} catch (err) {
setMensajes(prev => prev.filter(m => m.texto !== tempMensaje.texto || m.usuario_id !== tempMensaje.usuario_id || m.conversacion_id !== tempMensaje.conversacion_id));
console.error('❌ Error de conexión:', err);
alert('Error de conexión con el servidor');
}
};

return (
<div className="min-h-screen flex flex-col justify-between bg-gradient-to-tr from-slate-100 to-white p-4">
{usuario && (
<div className="p-4 bg-blue-200 rounded mb-4 max-w-sm mx-auto text-center">
<h3 className="text-xl font-semibold">Hola, {usuario.username || usuario.user}!</h3>
 <p>ID: {usuario.id}</p>
 <p>Email: {usuario.email}</p>
</div>
)}
<form onSubmit={crearConversacion} className="flex gap-2 mb-4">
 <input type="text" value={usuario2Id} onChange={e => setUsuario2Id(e.target.value)} placeholder="ID del usuario con quien chatear" className="flex-1 p-2 border rounded" />
 <button type="submit" className="bg-green-600 text-white px-4 rounded">Crear Conversación</button>
 </form>
 <div className="flex gap-2 mb-4">
 {conversaciones.map(c => (
<button key={c.id} onClick={() => setConversacionId(c.id)} className={`px-3 py-1 rounded ${conversacionId === c.id ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>
 Chat con {c.nombre_contacto || c.usuario2_id}
 </button>
))}
 </div>
<form onSubmit={enviarMensaje} className="flex gap-2 mb-4">
<input type="text" value={mensaje} onChange={(e) => setNuevoMensaje(e.target.value)} placeholder="Escribe un mensaje..." className="flex-1 p-2 border rounded" />
 <button type="submit" className="bg-blue-600 text-white px-4 rounded">Enviar</button>
</form>
<div 
ref={chatContainerRef} 
id="chat-container" 
data-conversacion-id={conversacionId} 
className="flex-1 overflow-y-auto p-2 border rounded"
onScroll={(e) => {
 const { scrollTop } = e.currentTarget;
 if (scrollTop === 0) {
cargarMensajesAntiguos();
}
}}
>
{cargandoMasMensajes && (
 <div className="text-center text-gray-500 my-2">Cargando mensajes...</div>
 )}
{Array.isArray(mensajes) && mensajes.map((m, i) => (
<div key={m.id || i} className={`mb-2 p-2 rounded ${m.usuario_id === usuario?.id ? 'bg-blue-100 ml-auto text-right' : 'bg-gray-200 mr-auto text-left'}`}>
     <strong>{m.autor_mensaje || m.usuario_id}</strong>: {m.texto}
 </div>
 ))}
</div>
 </div>
);
}

export default Home;