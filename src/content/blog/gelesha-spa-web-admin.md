---
title: "Gelesha Spa: cómo construí una web pública + panel admin completo para un negocio de estética"
description: "Caso de estudio: desarrollo de una plataforma completa para un spa en México. Web pública con 50+ servicios, sistema de agenda, módulo de cobros, dashboard financiero y reportes en Excel — desde cero hasta producción en Vercel."
pubDate: 2025-03-28
tags: ["Desarrollo Web", "SPA", "Panel Admin", "Dashboard", "JavaScript"]
readingTime: 9
featured: true
---

Cuando un negocio de servicios no tiene presencia digital, pierde clientes todos los días sin saberlo. Cuando tampoco tiene sistema de gestión, pierde dinero que no puede rastrear.

**Gelesha Spa** tenía los dos problemas.

Este es el caso de estudio de cómo resolví ambos con una sola plataforma: una web pública orientada a conversión + un panel administrativo completo. [Ver demo en vivo →](https://gelesha-proyect.vercel.app/)

---

## El punto de partida: diagnóstico real

Antes de escribir una sola línea de código, hice un levantamiento de necesidades:

**Problemas en el área comercial:**
- Sin sitio web — los clientes llegaban solo por Instagram y boca a boca
- El catálogo de servicios y precios solo existía en la cabeza de la dueña
- Las citas se agendaban por WhatsApp sin ningún sistema, con frecuentes olvidos y dobles reservas

**Problemas operativos:**
- Los cobros se registraban en cuadernos o en notas del teléfono
- No había forma de saber qué servicios generaban más ingresos
- Cierre de mes era un proceso manual de 2-3 días

**Lo que pedían:**
> "Quiero que mis clientas puedan ver mis servicios y precios en línea, y que yo pueda ver cuánto estoy generando cada semana."

Simple de entender. No tan simple de construir bien.

---

## La arquitectura: dos apps en una

Decidí construir un **SPA (Single Page Application)** con dos "modos":

```
gelesha-proyect.vercel.app/          → Web pública (clientas)
gelesha-proyect.vercel.app/admin     → Panel administrativo (dueña)
```

Ambas comparten el mismo codebase pero con rutas, estados y vistas completamente separados.

### Por qué un SPA y no WordPress o Wix

- **Control total** sobre el diseño y UX — sin plantillas que limiten
- **Admin integrado** sin necesidad de plugins ni costos adicionales
- **Una sola URL** para desplegar y mantener
- **Costo de hosting**: $0 en Vercel con el tier gratuito

---

## La web pública: diseñada para convertir

### El catálogo de servicios: el corazón del negocio

Con más de **50 servicios en 5 categorías** (masajes, faciales, aparatología, reductivos, depilación), la mayor preocupación de UX era el **discovery**: ¿cómo encuentra una clienta rápido lo que busca?

La solución: filtros por categoría + buscador en tiempo real.

```javascript
// Filtrado en tiempo real — sin recarga de página
function filterServices(category, searchTerm) {
  const filtered = allServices.filter(service => {
    const matchesCategory = category === 'all' || service.category === category;
    const matchesSearch   = service.name.toLowerCase()
                              .includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  renderServiceCards(filtered);
}

// Event listeners encadenados
categoryButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    activeCategory = btn.dataset.category;
    filterServices(activeCategory, searchInput.value);
  });
});

searchInput.addEventListener('input', () => {
  filterServices(activeCategory, searchInput.value);
});
```

Resultado: cualquier clienta llega al servicio que busca en menos de 5 segundos.

### El CTA principal: WhatsApp, no formularios

Probé con formulario de contacto primero. Análisis rápido: el spa ya tenía clientas que preferían WhatsApp y la dueña contestaba desde el teléfono. Un formulario solo agregaría fricción.

Cada tarjeta de servicio tiene un botón de WhatsApp con mensaje pre-llenado:

```javascript
function generateWhatsAppLink(serviceName, price) {
  const message = encodeURIComponent(
    `Hola Gelesha 🌿, me interesa agendar *${serviceName}* ($${price}). ¿Tienen disponibilidad?`
  );
  return `https://wa.me/52XXXXXXXXXX?text=${message}`;
}
```

La clienta hace clic → WhatsApp se abre con el mensaje listo → solo presiona enviar. Tasa de conversión mucho mayor que un formulario en frío.

---

## El panel admin: donde está el verdadero valor

El admin fue la parte más compleja y la que más impacto generó en el negocio.

### Autenticación

```javascript
// Verificación de credenciales en el login
function authenticate(username, password) {
  // En producción real, esto va contra una API/backend
  const credentials = {
    user: import.meta.env.ADMIN_USER,
    pass: import.meta.env.ADMIN_PASS,
  };

  if (username === credentials.user && password === credentials.pass) {
    sessionStorage.setItem('gelesha_auth', btoa(username + ':' + Date.now()));
    redirectToDashboard();
  } else {
    showShakeAnimation(); // feedback visual de error
    showError('Usuario o contraseña incorrectos');
  }
}

// Guard en cada vista del admin
function requireAuth() {
  const session = sessionStorage.getItem('gelesha_auth');
  if (!session) window.location.href = '/admin';
}
```

### Dashboard: KPIs que importan al negocio

Identifiqué las 4 métricas que la dueña necesitaba ver de un vistazo cada mañana:

```
┌─────────────────┬─────────────────┐
│  Ventas del mes │  Citas del mes  │
│   $45,200       │      38         │
├─────────────────┼─────────────────┤
│ Clientas únicas │  Ticket promedio│
│      24         │    $1,189       │
└─────────────────┴─────────────────┘
```

Más la gráfica de ventas por día (últimos 7 días) y el ranking de servicios más vendidos — ambos con **Chart.js**.

```javascript
// Gráfica de ventas de la semana
const salesChart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: getLast7Days(),     // ['Lun', 'Mar', 'Mié', ...]
    datasets: [{
      label: 'Ventas ($)',
      data: getSalesByDay(transactions, 7),
      borderColor: '#8B5CF6',
      backgroundColor: 'rgba(139, 92, 246, 0.1)',
      tension: 0.4,
      fill: true,
    }]
  },
  options: {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: val => `$${val.toLocaleString()}`,
        }
      }
    }
  }
});
```

### Módulo de Agenda (Citas)

El sistema de citas captura:
- Nombre y teléfono de la clienta
- Servicio seleccionado (del catálogo)
- Fecha y hora
- Estado: `pendiente → confirmada → completada / cancelada`

El flujo de estados permite a la dueña llevar control sin complicaciones:

```javascript
const STATUS_FLOW = {
  pendiente:  ['confirmada', 'cancelada'],
  confirmada: ['completada', 'cancelada'],
  completada: [],   // estado final
  cancelada:  [],   // estado final
};

function updateAppointmentStatus(id, newStatus) {
  const appt = appointments.find(a => a.id === id);
  if (!STATUS_FLOW[appt.status].includes(newStatus)) {
    return; // transición inválida
  }
  appt.status = newStatus;
  appt.updatedAt = new Date().toISOString();
  saveAppointments();
  renderAgenda();
}
```

### Módulo de Ventas / Cobros

Cada cobro registra:
- Cliente, servicio, monto
- Método de pago: efectivo / tarjeta / transferencia
- Fecha y hora automática

Los cobros alimentan directamente el dashboard y los reportes.

### Reportes exportables a Excel

Este fue el feature que más sorprendió a la dueña. Con un clic, descarga un Excel con todas las ventas del período seleccionado.

```javascript
import * as XLSX from 'xlsx';

function exportToExcel(period) {
  const data = getTransactionsByPeriod(period);

  const rows = data.map(t => ({
    'Fecha':           formatDate(t.date),
    'Cliente':         t.clientName,
    'Servicio':        t.serviceName,
    'Categoría':       t.category,
    'Monto':           t.amount,
    'Método de pago':  t.paymentMethod,
  }));

  // Hoja de detalle
  const wsDetail  = XLSX.utils.json_to_sheet(rows);

  // Hoja de resumen por categoría
  const summary   = summarizeByCategory(data);
  const wsSummary = XLSX.utils.json_to_sheet(summary);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsDetail,  'Detalle de ventas');
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen por categoría');

  XLSX.writeFile(wb, `Gelesha_Reporte_${period}_${new Date().toLocaleDateString()}.xlsx`);
}
```

---

## Despliegue en Vercel

El despliegue fue prácticamente instantáneo:

1. Push a GitHub
2. Conectar repositorio en Vercel
3. Configurar variables de entorno (credenciales del admin)
4. Deploy automático en cada push a `main`

**Tiempo de build**: ~30 segundos.
**Tiempo de respuesta (TTFB)**: <100ms desde México (CDN de Vercel).
**Costo mensual**: $0.

---

## Resultados en el primer mes

| Aspecto | Antes | Después |
|---|---|---|
| Presencia digital | Instagram únicamente | Web profesional indexada en Google |
| Catálogo de servicios | Solo en conversaciones | 50+ servicios con precios, online 24/7 |
| Gestión de citas | WhatsApp caótico | Agenda con estados y seguimiento |
| Registro de cobros | Cuaderno / notas | Sistema digital con historial |
| Reportes financieros | 2-3 días manual | Descarga en Excel en 1 clic |

La dueña ahora sabe exactamente qué servicios son los más rentables, qué días son los más ocupados y cuánto generó en el mes — sin hacer una sola suma a mano.

---

## Lecciones para proyectos similares

**1. El admin es tan importante como la web pública.** Para negocios pequeños, la herramienta interna de gestión puede ser el diferenciador real en el valor entregado.

**2. WhatsApp > formularios para negocios de servicio.** No peleé contra el hábito existente de la clienta — lo integré.

**3. Los reportes en Excel son el feature más valorado.** No Power BI, no Looker — Excel. Porque es lo que la dueña ya entiende y su contador ya usa.

**4. Vercel es imbatible para proyectos de este tipo.** $0, deploy automático, CDN global. Para un prototipo o MVP no hay mejor opción.

---

¿Tienes un negocio de servicios que necesita presencia digital y herramientas de gestión? [Hablemos.](https://wa.me/529983253195?text=Hola%20Edgar%2C%20le%C3%AD%20sobre%20el%20proyecto%20Gelesha%20Spa%20y%20me%20interesa%20algo%20similar%20para%20mi%20negocio)
