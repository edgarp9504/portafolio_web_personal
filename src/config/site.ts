export const SITE = {
  name: 'Edgar Pérez',
  brand: 'Edgar.dev',
  role: 'Data Engineer & Cloud Consultant',
  location: 'Cancún, México',
  url: 'https://www.edgar-perez.com',

  // Contacto
  whatsapp: '529983253195',
  email: 'edgar.perez@edgar-perez.com',

  // Redes (PENDIENTE: reemplazar LinkedIn con la URL real)
  linkedin: 'https://www.linkedin.com/in/EDGAR_LINKEDIN_REAL',
  github: 'https://github.com/edgarp9504',
} as const;

/** Arma un link de WhatsApp con un mensaje pre-cargado. */
export function waLink(message: string): string {
  return `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(message)}`;
}
