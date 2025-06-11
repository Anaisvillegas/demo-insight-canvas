"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";

export default function LandingPage() {
  useEffect(() => {
    // Initialize animations for fade-in sections
    const fadeInSections = document.querySelectorAll('.fade-in-section');
    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1
    };
    
    const observer = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);
    
    fadeInSections.forEach(section => {
      observer.observe(section);
    });

    // Mobile menu toggle
    const menuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (menuButton && mobileMenu) {
      menuButton.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
      });
      
      const mobileLinks = mobileMenu.querySelectorAll('a');
      mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
          mobileMenu.classList.add('hidden');
        });
      });
    }

    // Cleanup function
    return () => {
      if (observer) {
        fadeInSections.forEach(section => {
          observer.unobserve(section);
        });
      }
      
      if (menuButton && mobileMenu) {
        menuButton.removeEventListener('click', () => {
          mobileMenu.classList.toggle('hidden');
        });
      }
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white shadow-md sticky top-0 z-50">
        <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
            <div>
                <Link href="#" className="flex items-center">
                    <Image src="/LogoTecnoandina.png" alt="Tecnoandina Logo" width={300} height={75} className="h-15 w-auto" />
                </Link>
            </div>
            <div className="hidden md:flex items-center space-x-6">
                <Link href="#plataforma" className="text-[#4b5563] hover:text-[#1a56db] font-medium transition duration-300">Plataforma IA</Link>
                <Link href="#como-funciona" className="text-[#4b5563] hover:text-[#1a56db] font-medium transition duration-300">Cómo Funciona</Link>
                <Link href="#casos-uso" className="text-[#4b5563] hover:text-[#1a56db] font-medium transition duration-300">Casos de Uso</Link>
                <Link href="/signin" className="text-[#4b5563] hover:text-[#1a56db] font-medium transition duration-300">Iniciar Sesión</Link>
                <Link href="/signup" className="btn btn-outline text-sm">Registrarse</Link>
                <Link href="#contacto" className="btn btn-primary text-sm">Solicitar Demo</Link>
            </div>
            <div className="md:hidden">
                <button id="mobile-menu-button" className="text-[#4b5563] focus:outline-none">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path></svg>
                </button>
            </div>
        </nav>
        <div id="mobile-menu" className="md:hidden hidden bg-white py-2 border-t border-[#e5e7eb]">
            <Link href="#plataforma" className="block px-6 py-2 text-[#4b5563] hover:bg-[#f3f4f6] hover:text-[#1a56db]">Plataforma IA</Link>
            <Link href="#como-funciona" className="block px-6 py-2 text-[#4b5563] hover:bg-[#f3f4f6] hover:text-[#1a56db]">Cómo Funciona</Link>
            <Link href="#casos-uso" className="block px-6 py-2 text-[#4b5563] hover:bg-[#f3f4f6] hover:text-[#1a56db]">Casos de Uso</Link>
            <Link href="/signin" className="block px-6 py-2 text-[#4b5563] hover:bg-[#f3f4f6] hover:text-[#1a56db]">Iniciar Sesión</Link>
            <Link href="/signup" className="block px-6 py-2 text-[#1a56db] hover:bg-[#f3f4f6]">Registrarse</Link>
            <Link href="#contacto" className="block px-6 py-2 text-[#1a56db] font-medium hover:bg-[#f3f4f6]">Solicitar Demo</Link>
        </div>
      </header>

      <section className="pt-24 pb-16 md:pt-32 md:pb-24 relative overflow-hidden">
        {/* Video Background */}
        <div className="absolute inset-0 w-full h-full overflow-hidden z-0">
          <video 
            className="absolute min-w-full min-h-full object-cover"
            autoPlay 
            loop 
            muted 
            playsInline
          >
            <source src="/nodos.mp4" type="video/mp4" />
          </video>
          {/* Overlay to ensure text readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/90 to-white/70"></div>
        </div>
        
        <div className="container mx-auto px-6 relative z-10">
            <div className="max-w-3xl">
                <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight hero-gradient-text">
                    Transforma tu Negocio con IA Adaptativa
                </h1>
                <p className="text-lg md:text-xl mb-8 text-[#4b5563]">
                    Creamos asistentes digitales inteligentes que aprenden de tus datos y procesos para optimizar operaciones, generar insights y potenciar tu crecimiento.
                </p>
                <div className="flex flex-wrap gap-4">
                    <Link href="#contacto" className="btn btn-primary">Solicitar Demo</Link>
                    <Link href="#plataforma" className="btn btn-outline">Conocer Más</Link>
                </div>
            </div>
        </div>
      </section>

      <section id="plataforma" className="py-16 md:py-24 bg-white fade-in-section">
        <div className="container mx-auto px-6">
            <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4 text-[#111827]">Tu Asistente Digital Inteligente</h2>
                <p className="text-lg text-[#4b5563] max-w-3xl mx-auto">Una solución única que integra IA conversacional con un potente motor de conocimiento para resolver los desafíos específicos de tu empresa.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="bg-[#f9fafb] p-6 rounded-lg shadow-sm hover:shadow-lg transition-shadow duration-300 text-center">
                    <div className="feature-icon-wrapper">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-7 h-7">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 0 0 2.25-2.25V6.75a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 6.75v10.5a2.25 2.25 0 0 0 2.25 2.25Zm.75-12h9v9h-9v-9Z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-semibold mb-3 text-[#111827]">Aprendizaje Continuo</h3>
                    <p className="text-[#4b5563]">La IA aprende de tus datos, documentos y APIs, construyendo una base de conocimiento dinámica y específica para tu negocio.</p>
                </div>
                <div className="bg-[#f9fafb] p-6 rounded-lg shadow-sm hover:shadow-lg transition-shadow duration-300 text-center">
                    <div className="feature-icon-wrapper">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-7 h-7">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-semibold mb-3 text-[#111827]">Asistente Dinámico</h3>
                    <p className="text-[#4b5563]">Genera automáticamente dashboards, reportes, simulaciones y alertas, respondiendo preguntas complejas con información actualizada.</p>
                </div>
                <div className="bg-[#f9fafb] p-6 rounded-lg shadow-sm hover:shadow-lg transition-shadow duration-300 text-center">
                    <div className="feature-icon-wrapper">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-7 h-7">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.623 0-1.602-.36-3.112-.995-4.498a11.959 11.959 0 0 1-2.6-1.751A11.959 11.959 0 0 1 12 2.714Z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-semibold mb-3 text-[#111827]">Seguridad y Control</h3>
                    <p className="text-[#4b5563]">Integra tus propias claves API y gestiona el acceso a la información, manteniendo el control total sobre tus datos y la IA.</p>
                </div>
            </div>
        </div>
      </section>

      <section id="como-funciona" className="py-16 md:py-24 bg-[#f9fafb] fade-in-section">
        <div className="container mx-auto px-6">
            <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4 text-[#111827]">Cómo Potenciamos tu Inteligencia Empresarial</h2>
                <p className="text-lg text-[#4b5563] max-w-3xl mx-auto">Simplificamos la implementación de IA en tu empresa con un proceso claro y efectivo.</p>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
                <div className="w-full md:w-1/2">
                    <Image src="/imga2.png" alt="Diagrama del proceso de IA" width={600} height={400} className="rounded-lg shadow-md w-full" />
                </div>
                <div className="w-full md:w-1/2 space-y-8">
                    <div className="flex items-start">
                        <div className="workflow-step-number">1</div>
                        <div>
                            <h3 className="text-xl font-semibold mb-2 text-[#111827]">Conexión y Aprendizaje</h3>
                            <p className="text-[#4b5563]">Conectamos la IA a tus fuentes de datos (bases de datos, APIs, documentos). La IA procesa y entiende esta información, creando un &quot;grafo de conocimiento&quot; único para tu empresa.</p>
                        </div>
                    </div>
                    <div className="flex items-start">
                        <div className="workflow-step-number">2</div>
                        <div>
                            <h3 className="text-xl font-semibold mb-2 text-[#111827]">Interacción Inteligente</h3>
                            <p className="text-[#4b5563]">Interactúa con el asistente digital a través de chat. Haz preguntas complejas, solicita análisis o pide la creación de visualizaciones.</p>
                        </div>
                    </div>
                    <div className="flex items-start">
                        <div className="workflow-step-number">3</div>
                        <div>
                            <h3 className="text-xl font-semibold mb-2 text-[#111827]">Generación de Valor</h3>
                            <p className="text-[#4b5563]">El asistente utiliza el grafo de conocimiento y herramientas analíticas para generar respuestas precisas, dashboards interactivos, predicciones, detectar anomalías y automatizar tareas.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </section>

      <section id="casos-uso" className="py-16 md:py-24 bg-white fade-in-section">
        <div className="container mx-auto px-6">
            <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4 text-[#111827]">Impulsando Resultados en Diversas Áreas</h2>
                <p className="text-lg text-[#4b5563] max-w-3xl mx-auto">Nuestra plataforma se adapta para resolver desafíos críticos y descubrir oportunidades en múltiples sectores y funciones.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="border border-[#e5e7eb] rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300 bg-white flex flex-col">
                    <Image src="/imga3.png" alt="Caso de uso: Logística" width={400} height={200} className="use-case-img" />
                    <div className="p-6 flex flex-col flex-grow">
                        <h3 className="text-xl font-semibold mb-3 text-[#1a56db]">Inteligencia de Clientes</h3>
                        <p className="text-[#4b5563] mb-4 flex-grow">Comprende patrones de comportamiento, segmenta clientes de forma dinámica y personaliza ofertas para mejorar la retención y aumentar ventas.</p>
                        
                    </div>
                </div>
                <div className="border border-[#e5e7eb] rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300 bg-white flex flex-col">
                    <Image src="/imga4.png" alt="Caso de uso: Clientes" width={400} height={200} className="use-case-img" />
                    <div className="p-6 flex flex-col flex-grow">
                        <h3 className="text-xl font-semibold mb-3 text-[#1a56db]">Optimización de Operaciones</h3>
                        <p className="text-[#4b5563] mb-4 flex-grow">Analiza datos de producción, logística o cadena de suministro en tiempo real para identificar cuellos de botella, predecir fallos y optimizar rutas.</p>
                        
                    </div>
                </div>
                <div className="border border-[#e5e7eb] rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300 bg-white flex flex-col">
                    <Image src="/imga5.png" alt="Caso de uso: Riesgos" width={400} height={200} className="use-case-img" />
                    <div className="p-6 flex flex-col flex-grow">
                        <h3 className="text-xl font-semibold mb-3 text-[#1a56db]">Gestión de Riesgos</h3>
                        <p className="text-[#4b5563] mb-4 flex-grow">Detecta anomalías financieras, identifica posibles fraudes y monitorea indicadores clave de riesgo de forma proactiva.</p>
                        
                    </div>
                </div>
            </div>
        </div>
      </section>

      <section id="contacto" className="py-16 md:py-24 cta-gradient-bg text-white fade-in-section">
        <div className="container mx-auto px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">¿Listo para transformar tu negocio?</h2>
            <p className="text-lg md:text-xl mb-8 max-w-3xl mx-auto opacity-90">Conversemos sobre cómo la IA adaptativa de Tecnoandina puede generar un impacto real en tus resultados.</p>
            <Link href="mailto:contacto@tecnoandina.cl" className="btn btn-outline-white text-lg shadow-lg">Solicita una Demo Personalizada</Link>
        </div>
      </section>

      <footer className="footer-bg footer-text pt-16 pb-8">
        <div className="container mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
                <div className="md:col-span-1">
                    <Link href="#" className="text-2xl font-bold text-white mb-4 block">Tecnoandina</Link>
                    <p className="mb-6">Una solución de Tecnoandina para transformar empresas con inteligencia artificial y visualización de datos avanzada.</p>
                    <div className="flex space-x-4">
                        <Link href="https://www.linkedin.com/company/tecnoandina/" target="_blank" rel="noopener noreferrer" className="social-link" aria-label="LinkedIn">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                        </Link>
                    </div>
                </div>

                <div>
                    <h3 className="footer-heading">Producto</h3>
                    <ul className="space-y-3">
                        <li><Link href="#plataforma" className="footer-link">Plataforma IA</Link></li>
                        <li><Link href="#como-funciona" className="footer-link">Cómo Funciona</Link></li>
                        <li><Link href="#casos-uso" className="footer-link">Casos de Uso</Link></li>
                        <li><Link href="#contacto" className="footer-link">Solicitar Demo</Link></li>
                    </ul>
                </div>

                <div>
                    <h3 className="footer-heading">Empresa</h3>
                    <ul className="space-y-3">
                        <li><Link href="#" className="footer-link">Sobre Nosotros</Link></li>
                        <li><Link href="#" className="footer-link">Blog</Link></li>
                        <li><Link href="#" className="footer-link">Carreras</Link></li>
                        <li><Link href="mailto:contacto@tecnoandina.cl" className="footer-link">Contacto</Link></li>
                    </ul>
                </div>

                <div>
                    <h3 className="footer-heading">Recursos</h3>
                    <ul className="space-y-3">
                        <li><Link href="#" className="footer-link">Documentación</Link></li>
                        <li><Link href="#" className="footer-link">Tutoriales</Link></li>
                        <li><Link href="#" className="footer-link">Soporte</Link></li>
                        <li><Link href="#" className="footer-link">FAQ</Link></li>
                    </ul>
                </div>
            </div>

            <div className="text-center pt-8 border-t border-gray-700 text-sm">
                <p>&copy; 2025 Tecnoandina. Todos los derechos reservados.</p>
                <Link href="https://www.tecnoandina.cl/" target="_blank" rel="noopener noreferrer" className="footer-link mt-2 inline-block underline">Visita Tecnoandina.cl</Link>
            </div>
        </div>
      </footer>

      <style jsx global>{`
        /* Define color variables from the new design */
        :root {
            --primary: #1a56db; /* Blue */
            --primary-dark: #1e429f; /* Darker Blue */
            --secondary: #4b5563; /* Gray */
            --light: #f9fafb;    /* Light Gray / Almost White */
            --dark: #111827;     /* Very Dark Gray / Almost Black */
            --accent: #8b5cf6;   /* Purple */
            --success: #10b981;  /* Green */
            --warning: #f59e0b;  /* Yellow */
            --danger: #ef4444;   /* Red */
            --white: #ffffff;
            --gray-100: #f3f4f6;
            --gray-200: #e5e7eb;
            --gray-400: #9ca3af;
            --gray-600: #4b5563; /* Same as --secondary */
            --gray-800: #1f2937;
            --gray-900: #111827; /* Same as --dark */
        }

        /* Apply Inter font globally */
        body {
            font-family: 'Inter', sans-serif;
            background-color: var(--light);
            color: var(--dark);
        }

        /* Custom gradient text for Hero */
        .hero-gradient-text {
            background: linear-gradient(90deg, var(--primary), var(--accent));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        /* CTA Section Gradient Background */
        .cta-gradient-bg {
             background: linear-gradient(135deg, var(--primary), var(--accent));
        }

        /* Button Styles */
        .btn {
            display: inline-block;
            padding: 0.75rem 1.5rem; /* 12px 24px */
            border-radius: 0.375rem; /* 6px */
            font-weight: 500;
            text-decoration: none;
            cursor: pointer;
            transition: all 0.3s ease;
            text-align: center;
            border: 1px solid transparent; /* Base border */
        }
        .btn-primary {
            background-color: var(--primary);
            color: var(--white);
            border-color: var(--primary);
        }
        .btn-primary:hover {
            background-color: var(--primary-dark);
            border-color: var(--primary-dark);
        }
        .btn-outline {
            background-color: transparent;
            color: var(--primary);
            border-color: var(--primary);
        }
        .btn-outline:hover {
            background-color: var(--primary);
            color: var(--white);
        }
         .btn-outline-white { /* For CTA */
            background-color: var(--white);
            color: var(--primary);
            border-color: var(--white);
        }
        .btn-outline-white:hover {
            background-color: transparent;
            color: var(--white);
            border-color: var(--white);
        }

        /* Feature Card Icon Style */
        .feature-icon-wrapper {
            background-color: var(--primary);
            color: var(--white);
            width: 56px; /* 3.5rem */
            height: 56px; /* 3.5rem */
            border-radius: 12px; /* Custom rounded */
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem; /* 24px */
            margin-bottom: 1.5rem; /* 24px */
            margin-left: auto;
            margin-right: auto;
        }

        /* How it works step number */
         .workflow-step-number {
            background-color: var(--primary);
            color: white;
            width: 48px;
            height: 48px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.25rem;
            font-weight: 600;
            margin-right: 1rem; /* Spacing from text */
            flex-shrink: 0; /* Prevent shrinking */
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        /* Use Case Card Image */
        .use-case-img {
            width: 100%;
            height: 200px;
            object-fit: cover; /* Cover the area */
        }

        /* Footer Styles */
        .footer-bg { background-color: var(--dark); }
        .footer-text { color: var(--gray-400); } /* Lighter text for footer */
        .footer-link { color: var(--gray-200); transition: color 0.3s; }
        .footer-link:hover { color: var(--white); }
        .footer-heading { color: var(--white); font-weight: 600; margin-bottom: 1.5rem; font-size: 1.125rem; }
        .social-link {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background-color: rgba(255, 255, 255, 0.1);
            color: white;
            text-decoration: none;
            transition: background-color 0.3s;
        }
         .social-link:hover { background-color: var(--primary); }

        /* Simple scroll animation */
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .fade-in-section {
             opacity: 0;
             transform: translateY(20px);
             transition: opacity 0.8s ease-out, transform 0.8s ease-out;
        }
        .fade-in-section.visible {
             opacity: 1;
             transform: translateY(0);
        }
      `}</style>

      <script dangerouslySetInnerHTML={{
        __html: `
          // Mobile Menu Toggle Logic
          document.addEventListener('DOMContentLoaded', function() {
            const menuButton = document.getElementById('mobile-menu-button');
            const mobileMenu = document.getElementById('mobile-menu');
            
            if (menuButton && mobileMenu) {
              menuButton.addEventListener('click', function() {
                mobileMenu.classList.toggle('hidden');
              });
            }
            
            // Fade-in animation for sections
            const observerOptions = {
              root: null,
              rootMargin: '0px',
              threshold: 0.1
            };
            
            const observer = new IntersectionObserver(function(entries, observer) {
              entries.forEach(entry => {
                if (entry.isIntersecting) {
                  entry.target.classList.add('visible');
                  observer.unobserve(entry.target);
                }
              });
            }, observerOptions);
            
            // Observe all sections with the fade-in-section class
            document.querySelectorAll('.fade-in-section').forEach(section => {
              observer.observe(section);
            });
            
            // Smooth scroll for navigation links
            document.querySelectorAll('a[href^="#"]').forEach(anchor => {
              anchor.addEventListener('click', function (e) {
                e.preventDefault();
                
                const targetId = this.getAttribute('href');
                if (targetId === '#') return;
                
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                  targetElement.scrollIntoView({
                    behavior: 'smooth'
                  });
                  
                  // Close mobile menu after clicking a link
                  if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
                    mobileMenu.classList.add('hidden');
                  }
                }
              });
            });
          });
        `
      }} />
    </div>
  );
}
