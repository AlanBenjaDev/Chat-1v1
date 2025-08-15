import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';


function Create() {
  const navigate = useNavigate();
  const [user, setUser] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const registrarUsuario = async (e) => {
    e.preventDefault();
    setError('');

    if (user.length < 6) {
      setError('Usuario debe tener al menos 6 caracteres');
      return;
    }
    if (!email.includes('@')) {
      setError('Email inválido');
      return;
    }
    if (password.length < 8) {
      setError('Contraseña debe tener al menos 8 caracteres');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('http://localhost:3000/api/usuarios/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, email, password }),
      });

      const data = await res.json();

      if (res.ok) {
       
        navigate('/login');
      } else {
        setError(data.error || 'Error al registrar');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={registrarUsuario} className="p-4 flex flex-col gap-4 w-full max-w-md mx-auto">
      <h2 className="text-2xl font-bold">Registro</h2>

      {error && <p className="text-red-500">{error}</p>}

      <input type="text" placeholder="Usuario" value={user} onChange={e => setUser(e.target.value)} required className="border p-2 rounded" />
      <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="border p-2 rounded" />
      <input type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} required className="border p-2 rounded" />

      <button
        type="submit"
        disabled={loading}
        className='bg-blue-600 text-white py-2 rounded hover:bg-blue-700'
      >
        {loading ? 'Registrando...' : 'Registrarse'}
      </button>

      <div>
        <p className="mt-4 text-center text-sm text-gray-600">¿Ya tenés una cuenta?</p>
        <Link to="/login" className="text-blue-600 hover:underline font-medium">Iniciar Sesión</Link>
      </div>
    </form>
  );
}



export default Create;