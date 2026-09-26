// Usuarios del conteo: los administradores crean desde la web (Administración › Usuarios) a
// los personeros y a otros administradores.
// La cuenta se crea con el registro normal de Supabase (desde un cliente aparte, para no
// cerrar la sesión del administrador) y el acceso se lo da la función conteo_dar_acceso de
// esquema.sql. Sin esa fila en la tabla conteo_usuarios, una cuenta no ve ni cambia nada.
import { CLAVE_NUBE, URL_NUBE, cliente, fetchConLimite, type Rol } from './nube';

export interface Usuario {
  id: string;
  correo: string;
  nombre: string;
  rol: Rol;
  activo: boolean;
  creado: string;
  /** La cuenta la creó el conteo: solo a esas se les cambia la contraseña desde aquí. */
  creada_por_conteo?: boolean;
}

/** Mesas que anotó cada cuenta (según quién cambió los votos por última vez). */
export interface Actividad {
  mesas: number;
  ultima: string;
}

type ErrorSupabase = { code?: string; message?: string; status?: number; name?: string } | null;

const texto = (e: ErrorSupabase) => e?.message ?? String(e);

/** Mensajes de Supabase Auth en palabras simples. */
function explicar(e: ErrorSupabase): string {
  const codigo = e?.code ?? '';
  const msg = e?.message ?? '';
  if (e?.name === 'AuthRetryableFetchError') return 'No hay conexión con el servidor. Revisa tu internet.';
  if (codigo === 'user_already_exists' || /already registered/i.test(msg)) return 'Ese correo ya tiene una cuenta.';
  if (codigo === 'weak_password' || /password should be/i.test(msg))
    return 'La contraseña es muy corta o muy fácil: usa al menos 6 caracteres.';
  if (codigo === 'email_address_invalid' || /invalid format|is invalid/i.test(msg)) return 'Ese correo no es válido.';
  if (codigo === 'signup_disabled' || /signups not allowed/i.test(msg))
    return 'En Supabase está desactivado «Allow new users to sign up». Actívalo en Authentication › Sign In / Providers para poder crear usuarios.';
  if (codigo === 'email_address_not_authorized' || /confirmation email|sending.*email/i.test(msg))
    return 'Supabase intentó mandar un correo de confirmación. Desactiva «Confirm email» en Authentication › Sign In / Providers › Email y vuelve a intentar.';
  if (e?.status === 429 || /rate limit/i.test(msg))
    return 'Supabase no deja crear tantas cuentas seguidas. Espera unos minutos y sigue.';
  if (codigo === 'same_password' || /should be different/i.test(msg)) return 'Es la misma contraseña que ya tenías.';
  if (codigo === 'reauthentication_needed' || /reauthentication/i.test(msg))
    return 'Supabase pide volver a entrar para cambiarla: sal, entra otra vez y cámbiala enseguida.';
  return msg || 'No se pudo crear la cuenta.';
}

export async function listarUsuarios(): Promise<Usuario[]> {
  const { data, error } = await (await cliente()).from('conteo_usuarios').select('*').order('creado');
  if (error) throw error;
  return (data ?? []) as Usuario[];
}

export async function actividad(): Promise<Map<string, Actividad>> {
  const { data, error } = await (await cliente()).from('votos_mesa').select('actualizado_por, actualizado');
  if (error) throw error;
  const porCuenta = new Map<string, Actividad>();
  for (const f of (data ?? []) as { actualizado_por: string | null; actualizado: string }[]) {
    if (!f.actualizado_por) continue;
    const a = porCuenta.get(f.actualizado_por) ?? { mesas: 0, ultima: '' };
    a.mesas++;
    if (f.actualizado > a.ultima) a.ultima = f.actualizado;
    porCuenta.set(f.actualizado_por, a);
  }
  return porCuenta;
}

/** Id de la cuenta con la que se entró. */
export async function miId(): Promise<string | undefined> {
  return (await (await cliente()).auth.getSession()).data.session?.user.id;
}

/** Crea la cuenta (personero o administrador) y le da acceso. Devuelve un error para mostrar, o un aviso. */
export async function crearUsuario(
  nombre: string,
  correo: string,
  clave: string,
  rol: Rol = 'personero',
): Promise<{ error?: string; aviso?: string }> {
  const { createClient } = await import('@supabase/supabase-js');
  // Cliente aparte que no guarda la sesión nueva: el administrador sigue con la suya.
  const aparte = createClient(URL_NUBE!, CLAVE_NUBE!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'conteo-votos:alta' },
    global: { fetch: fetchConLimite },
  });
  const { data, error } = await aparte.auth.signUp({ email: correo, password: clave, options: { data: { nombre } } });
  let aviso: string | undefined;
  if (error) {
    const problema = explicar(error);
    if (problema !== 'Ese correo ya tiene una cuenta.') return { error: problema };
    // Ya tenía cuenta en este proyecto de Supabase (quizá de otra aplicación): se le da acceso,
    // pero su contraseña no se toca.
    aviso =
      'Ese correo ya tenía una cuenta en este proyecto de Supabase (quizá de otra aplicación): se le dio acceso, y entra con la contraseña que ya tenía, no con la que pusiste. Si esa cuenta entra con Google o no recuerda la contraseña, usa otro correo.';
  } else if (!data.session) {
    aviso =
      'La cuenta se creó, pero Supabase le mandó un correo para confirmarla y no podrá entrar hasta hacerlo. Para que no pase con los siguientes, desactiva «Confirm email» en Supabase.';
  }
  const acceso = await darAcceso(correo, nombre, rol);
  if (acceso.error) return { error: acceso.error };
  return { aviso };
}

/** Da (o devuelve) el acceso a una cuenta, como personero o como administrador. */
export async function darAcceso(correo: string, nombre = '', rol: Rol = 'personero'): Promise<{ id?: string; error?: string }> {
  const args: Record<string, string> = { correo_personero: correo, nombre_personero: nombre };
  // El rol solo se manda si no es el de siempre: así también funciona con el esquema anterior.
  if (rol !== 'personero') args.rol_nuevo = rol;
  const { data, error } = await (await cliente()).rpc('conteo_dar_acceso', args);
  if (error && rol === 'admin' && /rol_nuevo|could not find/i.test(error.message))
    return {
      error:
        'Para crear administradores hay que actualizar Supabase: en Administración › Resumen pulsa «Copiar SQL de Supabase» y córrelo en Supabase › SQL Editor.',
    };
  return error ? { error: texto(error) } : { id: String(data) };
}

export async function cambiarDatos(
  id: string,
  cambios: { nombre?: string; activo?: boolean; rol?: Rol },
): Promise<string | null> {
  const { error } = await (await cliente()).from('conteo_usuarios').update(cambios).eq('id', id);
  return error ? texto(error) : null;
}

/** Cambia la contraseña de la cuenta con la que se entró. */
export async function cambiarMiClave(clave: string): Promise<string | null> {
  const { error } = await (await cliente()).auth.updateUser({ password: clave });
  return error ? explicar(error) : null;
}

export async function cambiarClave(id: string, clave: string): Promise<string | null> {
  const { error } = await (await cliente()).rpc('conteo_cambiar_clave', { personero: id, clave });
  if (!error) return null;
  if (/permission denied/i.test(error.message))
    return 'Supabase no deja cambiar contraseñas desde aquí. Quítale el acceso y créale otra cuenta con otro correo.';
  return texto(error);
}

/** Contraseña fácil de dictar: sin letras ni números que se confundan (0/O, 1/l/I). */
export function claveNueva(largo = 8): string {
  const letras = 'abcdefghjkmnpqrstuvwxyz23456789';
  const azar = crypto.getRandomValues(new Uint32Array(largo));
  return Array.from(azar, (n) => letras[n % letras.length]).join('');
}
