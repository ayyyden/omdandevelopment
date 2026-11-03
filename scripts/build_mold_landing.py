"""Builds /mold-estimate/, the Meta ad landing page for mold removal.

The <head> (gtag, Meta Pixel, styles) and the booking card come from
/outdoor-remodel/ so both ad pages book the same way; step 4 asks where the
mold is instead of the outdoor project type. English/Spanish via data-es
(mold-estimate/i18n.js). Not indexed and not in the sitemap.

Run from the repo root:  python scripts/build_mold_landing.py
"""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def read(p):
    with open(os.path.join(ROOT, p), encoding="utf-8") as f:
        return f.read()


src = read("outdoor-remodel/index.html")

head = src[:src.index("</head>")]
head = head.replace("<!-- Google Ads landing page: kept out of search results and the sitemap -->",
                    "<!-- Meta ads landing page: kept out of search results and the sitemap -->")
head = re.sub(r"<title>.*?</title>", "<title>Mold Removal &amp; Repair | Omdan Development</title>", head)
head = re.sub(r'<meta name="description" content="[^"]*">',
              '<meta name="description" content="Mold inspection, testing, removal and repair for homes across the Coachella Valley, High Desert and Inland Empire. We find the leak, remove the mold and rebuild. Free on-site estimate. CSLB #1148568.">',
              head)
head = head.replace('  <link rel="preload" as="image" href="/assets/15-hero.webp" fetchpriority="high" />\n',
                    '  <link rel="preload" as="image" href="/assets/mold/mold-removal-hero-bg.webp" fetchpriority="high" />\n'
                    '  <meta property="og:title" content="Mold Removal &amp; Repair | Omdan Development">\n'
                    '  <meta property="og:description" content="We find the leak, remove the mold and put your home back together. Free on-site estimate. CSLB #1148568.">\n'
                    '  <meta property="og:image" content="https://omdandevelopment.com/assets/mold/mold-removal-og.jpg">\n'
                    '  <meta property="og:image:width" content="1200">\n  <meta property="og:image:height" content="630">\n'
                    '  <meta property="og:type" content="website">\n')
head = head.replace("    .hero-overlay {", "    .hero-mold { background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); }\n    .hero-overlay {")
assert "Mold Removal &amp; Repair" in head and "fbq('init', '1064150789992386')" in head

card = src[src.index("      <!-- Booking card: booking.js runs the steps -->"):src.index("    </div>\n  </header>")]
card = card.replace('value="Omdan Development Outdoor Landing Page"', 'value="Omdan Development Mold Landing Page"')
card = card.replace('value="Google Ads: /outdoor-remodel/"', 'value="Meta Ads: /mold-estimate/"')
step4_old = card[card.index("          <!-- 4. Project and start -->"):card.index("          <!-- 5. Day and time -->")]
step4_new = '''          <!-- 4. Where the mold is, and how soon -->
          <section class="bk-step" data-step="project" hidden>
            <h2 class="bk-q" tabindex="-1" data-es="¿Dónde está el problema?">Where is the problem?</h2>
            <p class="text-sm text-muted mt-1" data-es="Escoja todos los que apliquen.">Pick all that apply.</p>
            <div class="grid grid-cols-2 gap-2 mt-3">
              <label class="chip relative"><input type="checkbox" name="services" value="mold-bathroom"><span data-es="Baño">Bathroom</span></label>
              <label class="chip relative"><input type="checkbox" name="services" value="mold-kitchen"><span data-es="Cocina / debajo del fregadero">Kitchen / under a sink</span></label>
              <label class="chip relative"><input type="checkbox" name="services" value="mold-ceiling"><span data-es="Techo / ático / gotera">Ceiling / attic / roof leak</span></label>
              <label class="chip relative"><input type="checkbox" name="services" value="mold-walls"><span data-es="Paredes / clóset">Walls / closet</span></label>
              <label class="chip relative"><input type="checkbox" name="services" value="mold-ac"><span data-es="Clóset del A/C / ventilas">AC closet / vents</span></label>
              <label class="chip relative"><input type="checkbox" name="services" value="mold-leak"><span data-es="Después de una fuga o inundación">After a leak or flood</span></label>
              <label class="chip relative col-span-2"><input type="checkbox" name="services" value="mold-test"><span data-es="No sé si es moho / quiero una prueba">Not sure it's mold / I want it tested</span></label>
            </div>
            <p id="bkServices-err" class="field-error"></p>
            <p class="block text-sm font-medium mt-5 mb-2" data-es="¿Qué tan pronto lo necesita?">How soon do you need it handled?</p>
            <div class="grid grid-cols-2 gap-2">
              <label class="chip relative"><input type="radio" name="start" value="asap"><span data-es="Lo antes posible">As soon as possible</span></label>
              <label class="chip relative"><input type="radio" name="start" value="1-3"><span data-es="En 1–3 meses">Within 1–3 months</span></label>
              <label class="chip relative"><input type="radio" name="start" value="3plus"><span data-es="En más de 3 meses">3+ months out</span></label>
              <label class="chip relative"><input type="radio" name="start" value="planning"><span data-es="Solo quiero saber">Just want to know</span></label>
            </div>
            <p id="bkStart-err" class="field-error"></p>
            <button type="button" id="bkNext4" class="bk-next" data-es="Siguiente">Next</button>
          </section>

'''
card = card.replace(step4_old, step4_new)
assert 'value="mold-test"' in card and 'value="turf"' not in card

REVIEWS = src[src.index('      <div class="grid md:grid-cols-3 gap-6">', src.index('<section id="reviews"')):src.index("  <!-- FAQ -->")]

FAQ = [
    ("¿Cuánto cuesta quitar el moho?", "How much does mold removal cost?",
     "Depende de qué tan grande sea el área, qué materiales están afectados, qué tan difícil es llegar, si hace falta una prueba y cuánto hay que reconstruir. Por eso vamos primero: le damos un precio personalizado en una cotización clara por escrito después de un estimado gratis en su casa.",
     "It depends on how large the area is, which materials are affected, how hard it is to reach, whether testing is needed and how much has to be rebuilt. That's why we visit first: you get personalized pricing in a clear written quote after a free on-site estimate."),
    ("¿Hacen pruebas de moho?", "Do you test for mold?",
     "Sí. Revisamos, medimos la humedad y hacemos pruebas cuando ayudan a contestar una pregunta, como si hay moho detrás de una pared. Si ya tiene un reporte de un inspector independiente, trabajamos con ese reporte.",
     "Yes. We inspect, take moisture readings and test when it helps answer a question, like whether there's mold behind a wall. If you already have a report from an independent inspector, we work from it."),
    ("¿Va a regresar el moho?", "Will the mold come back?",
     "No, si se arregla la fuente de humedad y el área se seca bien antes de cerrarla. Por eso cada trabajo empieza por encontrar la fuga o el problema de agua y lo arreglamos como parte del trabajo.",
     "Not if the moisture source is fixed and the area is properly dried before it's closed up. That's why every job starts with finding the leak or water problem, and we fix it as part of the work."),
    ("¿Puedo quedarme en mi casa durante el trabajo?", "Can I stay home while you work?",
     "Normalmente sí. Sellamos el área de trabajo con plástico y usamos filtración de aire HEPA para que el resto de la casa quede separado. En trabajos grandes, o si alguien en la casa tiene problemas de salud, platicamos si algunos cuartos deben quedar cerrados.",
     "Usually yes. We seal off the work area with plastic sheeting and use HEPA air filtration, so the rest of the home stays separate. On larger jobs, or if someone in the home has health concerns, we'll talk through whether certain rooms should be off-limits."),
    ("¿También reparan las paredes y el techo?", "Do you also repair the walls and ceiling?",
     "Sí. Somos contratista general Clase B, así que un solo equipo quita el moho, arregla la causa y reconstruye: tablaroca, aislamiento, pintura, zócalos, gabinetes o pisos.",
     "Yes. We're a Class B general building contractor, so one team removes the mold, fixes the cause and rebuilds: drywall, insulation, paint, baseboards, cabinets or flooring."),
    ("¿El seguro de casa cubre el moho?", "Does homeowners insurance cover mold?",
     "Depende de su póliza y de qué causó el moho. Los daños por algo repentino, como un tubo roto, a veces se tratan diferente que los daños por una fuga de mucho tiempo. Pregunte a su compañía de seguros. Le podemos dar fotos y un alcance del trabajo por escrito.",
     "It depends on your policy and what caused the mold. Damage from a sudden event, like a burst pipe, is often treated differently from a long-term leak. Check with your insurance company. We can give you photos and a written scope of the work."),
    ("¿En qué áreas trabajan?", "What areas do you serve?",
     "Valle de Coachella, Alto Desierto, el Paso e Inland Empire: de Palm Springs, Palm Desert e Indio a Yucca Valley, Twentynine Palms, Yucaipa, San Bernardino, Moreno Valley, Menifee, Murrieta y Temecula, y áreas cercanas.",
     "The Coachella Valley, High Desert, Pass area and Inland Empire: from Palm Springs, Palm Desert and Indio to Yucca Valley, Twentynine Palms, Yucaipa, San Bernardino, Moreno Valley, Menifee, Murrieta and Temecula, and nearby areas."),
]
faq_html = "\n".join(f'''        <details class="rounded-xl border border-line bg-white p-5">
          <summary class="flex justify-between items-center gap-4 font-bold"><span data-es="{qes}">{qen}</span><i data-feather="plus" class="faq-icon w-5 h-5 flex-shrink-0"></i></summary>
          <p class="mt-3 text-muted" data-es="{aes}">{aen}</p>
        </details>''' for qes, qen, aes, aen in FAQ)

page = head + '''</head>
<body class="font-sans text-ink bg-white antialiased">

  <!-- Top bar: no site navigation on purpose, so visitors stay on the form -->
  <div class="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-line">
    <div class="max-w-7xl mx-auto px-5 py-3 flex justify-between items-center gap-3">
      <div class="flex items-center gap-3 min-w-0">
        <img src="/assets/logo.webp" alt="Omdan Development Inc logo" class="h-9 w-auto flex-shrink-0" loading="eager" width="1024" height="1024" />
        <div class="min-w-0">
          <div class="font-bold text-base sm:text-lg leading-tight truncate">Omdan Development</div>
          <div class="text-xs text-muted leading-tight" data-es="Con licencia y seguro · CSLB #1148568">Licensed &amp; Insured · CSLB #1148568</div>
        </div>
      </div>
      <div class="flex items-center gap-2 flex-shrink-0">
      <button type="button" data-lang-toggle class="inline-flex items-center gap-1.5 border border-line bg-white text-ink px-3 py-2 rounded-lg font-semibold text-sm hover:bg-soft transition">
        <i data-feather="globe" class="w-4 h-4"></i><span data-lang-short>ES</span>
      </button>
      <a href="tel:9512920703" data-track="lp_header_call"
         class="inline-flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg font-semibold whitespace-nowrap hover:opacity-95 transition">
        <i data-feather="phone" class="w-4 h-4"></i>
        <span class="hidden sm:inline">(951) 292-0703</span><span class="sm:hidden" data-es="Llamar">Call</span>
      </a>
      </div>
    </div>
  </div>

  <!-- Hero + form -->
  <header id="hero" class="relative bg-center bg-no-repeat bg-cover"
          style="background-image:url('/assets/mold/mold-removal-hero-bg.webp'); background-size:cover; background-position:center;">
    <div class="hero-overlay absolute inset-0" aria-hidden="true"></div>
    <div class="max-w-7xl mx-auto px-5 py-8 md:py-14 w-full relative grid md:grid-cols-2 gap-8 items-start">
      <div class="text-white">
        <button type="button" data-lang-toggle class="mb-5 inline-flex items-center gap-2 bg-white text-ink px-5 py-3 rounded-full font-bold text-base shadow-lg hover:opacity-95 transition">
          <i data-feather="globe" class="w-5 h-5 text-brand"></i><span data-lang-label>Ver en español</span>
        </button>
        <h1 class="text-3xl sm:text-5xl font-extrabold leading-tight" data-es="Eliminación de moho, hecha bien">
          Mold Removal, Done Right
        </h1>
        <p class="mt-3 text-lg text-white/90" data-es="Encontramos la fuga, quitamos el moho y dejamos su casa reparada. Un solo equipo con licencia, de principio a fin.">
          We find the leak, remove the mold and put your home back together. One licensed team, start to finish.
        </p>
        <p class="mt-2 text-white/90 font-medium" data-es="Estimado gratis en su casa. David está en cada proyecto.">Free on-site estimate. David is on every project.</p>
        <p class="mt-1 text-white/80 text-sm" data-es="Servimos el Valle de Coachella, el Alto Desierto y el Inland Empire.">Serving the Coachella Valley, the High Desert and the Inland Empire.</p>

        <ul class="mt-6 grid grid-cols-2 gap-3 text-sm font-medium text-white/95">
          <li class="flex items-center gap-2"><i data-feather="search" class="w-4 h-4 flex-shrink-0"></i><span data-es="Inspección y pruebas">Inspection &amp; testing</span></li>
          <li class="flex items-center gap-2"><i data-feather="droplet" class="w-4 h-4 flex-shrink-0"></i><span data-es="Arreglamos la fuga">We fix the leak</span></li>
          <li class="flex items-center gap-2"><i data-feather="shield" class="w-4 h-4 flex-shrink-0"></i><span data-es="Área sellada mientras trabajamos">Sealed-off work area</span></li>
          <li class="flex items-center gap-2"><i data-feather="tool" class="w-4 h-4 flex-shrink-0"></i><span data-es="Reparamos paredes y techos">We rebuild walls &amp; ceilings</span></li>
        </ul>
      </div>

''' + card + '''    </div>
  </header>

  <!-- Trust strip -->
  <section class="bg-soft border-b border-line">
    <div class="max-w-7xl mx-auto px-5 py-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm font-medium">
      <div class="flex items-center gap-2"><i data-feather="award" class="w-5 h-5 text-brand flex-shrink-0"></i>CSLB #1148568</div>
      <div class="flex items-center gap-2"><i data-feather="shield" class="w-5 h-5 text-brand flex-shrink-0"></i><span data-es="Asegurados y con fianza">Insured &amp; bonded</span></div>
      <div class="flex items-center gap-2"><i data-feather="star" class="w-5 h-5 text-brand flex-shrink-0"></i><span data-es="Reseñas de 5 estrellas en Google">5-star Google reviews</span></div>
      <div class="flex items-center gap-2"><i data-feather="user-check" class="w-5 h-5 text-brand flex-shrink-0"></i><span data-es="El dueño en cada proyecto">Owner on every project</span></div>
    </div>
  </section>

  <!-- Signs -->
  <section class="py-14">
    <div class="max-w-7xl mx-auto px-5">
      <div class="text-center mb-10">
        <h2 class="text-3xl font-extrabold" data-es="¿Le suena familiar?">Sound familiar?</h2>
        <p class="mt-2 text-muted" data-es="Estas son las señales más comunes de moho en casa. Muchas veces crece donde no se ve.">These are the most common signs of mold at home. It often grows where you can't see it.</p>
      </div>
      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div class="rounded-xl border border-line bg-white p-6">
          <i data-feather="wind" class="w-6 h-6 text-brand"></i>
          <h3 class="mt-3 font-bold" data-es="Olor a humedad">A musty smell</h3>
          <p class="mt-1 text-sm text-muted" data-es="Un olor a encerrado que no se quita, sobre todo en un clóset, un baño o debajo del fregadero.">A stale, earthy smell that won't go away, often in a closet, bathroom or under a sink.</p>
        </div>
        <div class="rounded-xl border border-line bg-white p-6">
          <i data-feather="circle" class="w-6 h-6 text-brand"></i>
          <h3 class="mt-3 font-bold" data-es="Manchas en paredes o techo">Spots or stains</h3>
          <p class="mt-1 text-sm text-muted" data-es="Puntos negros o verdes, manchas de agua en el techo o en la lechada del baño.">Black or green spotting, water stains on the ceiling, or dark grout in the shower.</p>
        </div>
        <div class="rounded-xl border border-line bg-white p-6">
          <i data-feather="layers" class="w-6 h-6 text-brand"></i>
          <h3 class="mt-3 font-bold" data-es="Pintura o zócalos dañados">Peeling paint, swollen baseboards</h3>
          <p class="mt-1 text-sm text-muted" data-es="Pintura que se levanta, tablaroca blanda o zócalos hinchados cerca de un baño o del piso.">Paint that bubbles or peels, soft drywall, or baseboards that swell near a bathroom or the floor.</p>
        </div>
        <div class="rounded-xl border border-line bg-white p-6">
          <i data-feather="droplet" class="w-6 h-6 text-brand"></i>
          <h3 class="mt-3 font-bold" data-es="Una fuga reciente">A recent leak</h3>
          <p class="mt-1 text-sm text-muted" data-es="Una fuga, un A/C que goteó o una inundación que no se secó en uno o dos días.">A leak, an AC that dripped, or a flood that wasn't fully dried within a day or two.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Our work -->
  <section class="py-14 bg-white border-t border-line">
    <div class="max-w-7xl mx-auto px-5">
      <div class="text-center mb-10">
        <h2 class="text-3xl font-extrabold" data-es="Trabajos reales de moho">Real mold jobs</h2>
        <p class="mt-2 text-muted" data-es="Fotos de nuestros propios trabajos.">Photos from our own work.</p>
      </div>
      <div class="grid md:grid-cols-2 gap-6">
        <figure>
          <img src="/assets/mold/sink-cabinet-before-after.webp" alt="Kitchen sink cabinet with mold before, clean and sealed after" class="rounded-xl border border-line w-full h-auto" width="1774" height="887" loading="lazy" decoding="async">
          <figcaption class="text-sm text-muted mt-2 text-center" data-es="Debajo del fregadero de la cocina: antes y después.">Under a kitchen sink: before and after.</figcaption>
        </figure>
        <figure>
          <img src="/assets/mold/shower-tile-before-after.webp" alt="Shower tile corner with mold in the grout before, clean after" class="rounded-xl border border-line w-full h-auto" width="1774" height="887" loading="lazy" decoding="async">
          <figcaption class="text-sm text-muted mt-2 text-center" data-es="Azulejo, lechada y silicón de la regadera: antes y después.">Shower tile, grout and caulk: before and after.</figcaption>
        </figure>
      </div>
      <div class="grid sm:grid-cols-3 gap-6 mt-6">
        <figure>
          <img src="/assets/mold/wall-framing-before-after.webp" alt="Bathroom wall opened up: moldy framing before, cleaned framing after" class="rounded-xl border border-line w-full h-64 object-cover" width="1254" height="1254" loading="lazy" decoding="async">
          <figcaption class="text-sm text-muted mt-2 text-center" data-es="Pared del baño abierta: antes y después.">Bathroom wall opened up: before and after.</figcaption>
        </figure>
        <figure>
          <img src="/assets/mold/ceiling-and-wall-under-containment.webp" alt="Mold across a ceiling and wall, with the room sealed in plastic" class="rounded-xl border border-line w-full h-64 object-cover" width="1086" height="1448" loading="lazy" decoding="async">
          <figcaption class="text-sm text-muted mt-2 text-center" data-es="Techo y pared, área sellada antes de quitar el moho.">Ceiling and wall, sealed off before removal.</figcaption>
        </figure>
        <figure>
          <img src="/assets/mold/wall-corner-under-containment.webp" alt="Mold on a wall corner with the floor and furniture covered in plastic" class="rounded-xl border border-line w-full h-64 object-cover" width="1086" height="1448" loading="lazy" decoding="async">
          <figcaption class="text-sm text-muted mt-2 text-center" data-es="Cubrimos y sellamos el área antes de empezar.">Work area covered and taped before we start.</figcaption>
        </figure>
      </div>
    </div>
  </section>

  <!-- How it works -->
  <section class="py-14 bg-soft">
    <div class="max-w-7xl mx-auto px-5">
      <h2 class="text-3xl font-extrabold text-center mb-3" data-es="Cómo funciona">How it works</h2>
      <p class="text-center text-muted mb-10" data-es="Muchas compañías quitan el moho y le dejan las paredes abiertas. Nosotros terminamos el trabajo.">Many mold companies remove the damage and leave you with open walls. We finish the job.</p>
      <ol class="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <li class="rounded-xl border border-line bg-white p-6">
          <div class="w-9 h-9 rounded-full bg-brand text-white font-bold flex items-center justify-center">1</div>
          <h3 class="mt-3 font-bold" data-es="Revisamos y probamos">Inspect &amp; test</h3>
          <p class="mt-1 text-sm text-muted" data-es="David va a su casa, mide la humedad, encuentra de dónde viene el agua y hace pruebas cuando hacen falta.">David comes out, takes moisture readings, finds where the water comes from and tests when it's needed.</p>
        </li>
        <li class="rounded-xl border border-line bg-white p-6">
          <div class="w-9 h-9 rounded-full bg-brand text-white font-bold flex items-center justify-center">2</div>
          <h3 class="mt-3 font-bold" data-es="Cotización clara por escrito">Clear written quote</h3>
          <p class="mt-1 text-sm text-muted" data-es="Precio personalizado y fechas, antes de empezar cualquier trabajo.">Personalized pricing and a timeline, before any work starts.</p>
        </li>
        <li class="rounded-xl border border-line bg-white p-6">
          <div class="w-9 h-9 rounded-full bg-brand text-white font-bold flex items-center justify-center">3</div>
          <h3 class="mt-3 font-bold" data-es="Sellamos, quitamos y arreglamos">Contain, remove &amp; fix</h3>
          <p class="mt-1 text-sm text-muted" data-es="Sellamos el área, quitamos lo dañado, limpiamos con equipo HEPA y arreglamos la fuga.">We seal off the area, remove what's damaged, clean with HEPA equipment and fix the leak.</p>
        </li>
        <li class="rounded-xl border border-line bg-white p-6">
          <div class="w-9 h-9 rounded-full bg-brand text-white font-bold flex items-center justify-center">4</div>
          <h3 class="mt-3 font-bold" data-es="Reconstruimos">We rebuild</h3>
          <p class="mt-1 text-sm text-muted" data-es="Tablaroca, aislamiento, pintura, gabinetes o pisos, hasta que el cuarto quede terminado.">Drywall, insulation, paint, cabinets or flooring, until the room is finished.</p>
        </li>
      </ol>
    </div>
  </section>

  <!-- Reviews (genuine Google reviews; these customers hired us for other projects) -->
  <section id="reviews" class="py-14">
    <div class="max-w-7xl mx-auto px-5">
      <div class="text-center mb-10">
        <h2 class="text-3xl font-extrabold" data-es="Lo que dicen los dueños de casa">What homeowners say</h2>
        <p class="mt-2 text-muted" data-es="Reseñas de Google de nuestros clientes (en inglés, como las escribieron)">Google reviews from our customers</p>
      </div>
''' + REVIEWS + '''  <!-- FAQ -->
  <section class="py-14 bg-soft">
    <div class="max-w-3xl mx-auto px-5">
      <h2 class="text-3xl font-extrabold text-center mb-8" data-es="Preguntas frecuentes">Common questions</h2>
      <div class="space-y-3">
''' + faq_html + '''
      </div>
    </div>
  </section>

  <!-- Bottom CTA -->
  <section class="py-14 bg-ink text-white">
    <div class="max-w-3xl mx-auto px-5 text-center">
      <h2 class="text-3xl font-extrabold" data-es="No deje que una fuga pequeña se haga grande">Don't let a small leak turn into a big job</h2>
      <p class="mt-3 text-white/80" data-es="Estimado gratis en su casa, sin compromiso. Con licencia y seguro, CSLB #1148568.">Free on-site estimate, no obligation. Licensed &amp; insured, CSLB #1148568.</p>
      <div class="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
        <a href="#estimate" data-track="lp_bottom_estimate" class="inline-flex items-center justify-center bg-brand text-white px-7 py-3 rounded-lg font-semibold text-lg hover:opacity-95 transition" data-es="Quiero mi estimado gratis">Get My Free Estimate</a>
        <a href="tel:9512920703" data-track="lp_bottom_call" class="inline-flex items-center justify-center bg-white/10 text-white px-7 py-3 rounded-lg font-semibold text-lg border border-white/25 hover:bg-white/15 transition" data-es="Llame al (951) 292-0703">Call (951) 292-0703</a>
      </div>
    </div>
  </section>

  <footer class="bg-ink text-white/60 border-t border-white/10 py-6 text-sm">
    <div class="max-w-7xl mx-auto px-5 flex flex-col sm:flex-row justify-between gap-2">
      <div>© <span id="year">2026</span> Omdan Development Inc · CSLB #1148568</div>
      <div class="flex gap-4">
        <a href="/privacy/" class="hover:text-white" data-es="Privacidad">Privacy</a>
        <a href="/terms-and-conditions/" class="hover:text-white" data-es="Términos">Terms</a>
      </div>
    </div>
  </footer>

  <!-- Mobile estimate bar -->
  <div class="h-20 md:hidden" aria-hidden="true"></div>
  <div class="fixed inset-x-0 bottom-0 z-40 md:hidden bg-white/95 backdrop-blur border-t border-line px-4 pt-3 flex gap-3" style="padding-bottom:calc(.75rem + env(safe-area-inset-bottom))">
    <a href="tel:9512920703" data-track="lp_mobile_call" class="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 py-3 text-sm font-semibold text-ink">
      <i data-feather="phone" class="w-4 h-4"></i><span data-es="Llamar">Call</span>
    </a>
    <a href="#estimate" data-track="lp_mobile_estimate" class="flex-[2] inline-flex items-center justify-center rounded-lg bg-brand px-3 py-3 text-sm font-semibold text-white" data-es="Quiero mi estimado gratis">
      Get My Free Estimate
    </a>
  </div>

  <script>
    (function () {
      // Click tracking for calls and CTA buttons (GA4); a tap on a phone link is a Contact for Meta
      document.querySelectorAll('[data-track]').forEach(function (el) {
        el.addEventListener('click', function () {
          if (window.gtag) gtag('event', el.getAttribute('data-track'), { service_page: 'mold' });
          if (window.fbq && /^tel:/.test(el.getAttribute('href') || '')) fbq('track', 'Contact');
        });
      });
      document.getElementById('year').textContent = new Date().getFullYear();
    })();

    document.addEventListener('DOMContentLoaded', function () { if (window.feather) feather.replace(); });
  </script>

  <script src="/mold-estimate/i18n.js?v=1" defer></script>
  <script src="/mold-estimate/booking.js?v=1" defer></script>
</body>
</html>
'''

with open(os.path.join(ROOT, "mold-estimate/index.html"), "w", encoding="utf-8", newline="\n") as f:
    f.write(page)
print("wrote mold-estimate/index.html")
