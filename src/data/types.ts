export interface Service {
  icon: string;        // nombre de icono lucide (ver Fase 3/4), no emoji
  title: string;
  summary: string;     // propuesta de valor en una línea (carrusel conciso)
  tags: string[];
}

export interface StackGroup {
  label: string;
  items: string[];
}

export interface Project {
  label: string;
  icon: string;         // nombre de icono lucide
  title: string;
  problem: string;
  solution: string;
  impact: string;       // la impact-badge verde
  tags: string[];
  url?: string;
  featured?: boolean;
}
