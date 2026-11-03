"""Builds /mold-removal/ and its 13 city pages.

The header, nav, booking form and footer are copied from the live insulation
pages, so the mold pages look and book exactly like the rest of the site.
Each city page gets its own content (no copy-paste city pages).

Content rules (content/blog-rules.md, ACTION-PLAN.md): residential only, no
prices, free on-site estimate CTA, Class B license only, no invented
projects/reviews/certifications, no health claims.

Run from the repo root:  python scripts/build_mold_pages.py
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "https://omdandevelopment.com"
PHONE = "(951) 292-0703"


def read(p):
    with open(os.path.join(ROOT, p), encoding="utf-8") as f:
        return f.read()


def write(p, s):
    full = os.path.join(ROOT, p)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w", encoding="utf-8", newline="\n") as f:
        f.write(s)
    print("wrote", p)


def between(s, start, end=None):
    i = s.index(start)
    j = s.index(end, i) if end else len(s)
    return s[i:j]


def faq_schema(faqs):
    return json.dumps({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [{"@type": "Question", "name": q,
                        "acceptedAnswer": {"@type": "Answer", "text": re.sub("<[^>]+>", "", a)}}
                       for q, a in faqs],
    }, indent=2, ensure_ascii=False)


CITIES = [
    # slug, name, nearby slugs
    ("palm-springs", "Palm Springs", ["cathedral-city", "desert-hot-springs", "palm-desert"]),
    ("palm-desert", "Palm Desert", ["indio", "cathedral-city", "palm-springs"]),
    ("cathedral-city", "Cathedral City", ["palm-springs", "palm-desert", "desert-hot-springs"]),
    ("indio", "Indio", ["palm-desert", "cathedral-city", "palm-springs"]),
    ("desert-hot-springs", "Desert Hot Springs", ["palm-springs", "cathedral-city", "yucca-valley"]),
    ("yucca-valley", "Yucca Valley", ["twentynine-palms", "desert-hot-springs", "yucaipa"]),
    ("twentynine-palms", "Twentynine Palms", ["yucca-valley", "desert-hot-springs", "indio"]),
    ("yucaipa", "Yucaipa", ["san-bernardino", "moreno-valley", "yucca-valley"]),
    ("san-bernardino", "San Bernardino", ["yucaipa", "moreno-valley", "menifee"]),
    ("moreno-valley", "Moreno Valley", ["san-bernardino", "menifee", "murrieta"]),
    ("menifee", "Menifee", ["murrieta", "moreno-valley", "temecula"]),
    ("murrieta", "Murrieta", ["temecula", "menifee", "moreno-valley"]),
    ("temecula", "Temecula", ["murrieta", "menifee", "moreno-valley"]),
]
NAMES = {s: n for s, n, _ in CITIES}

# ─── per-city content ────────────────────────────────────────────────────────
# lead: one-line summary under the H1 · intro: 2 paragraphs · h2: intro heading
# spots: (title, text) where mold shows up in this city's homes · faqs: (q, a)
CITY = {
    "palm-springs": dict(
        h2="Palm Springs mold usually starts with a leak nobody saw",
        lead="Flat roofs, seasonal homes that sit empty all summer, and AC systems that run nonstop make hidden leaks the most common cause of mold we see in Palm Springs.",
        intro=[
            "Mold needs water, and in a city as dry as Palm Springs the water almost always comes from inside the house or through the roof: a slow leak under a sink, an AC condensate line that backs up, or a flat roof that holds water after a storm. Because the outdoor air is so dry, these problems tend to stay hidden inside walls, ceilings and closets until there is a smell or a stain.",
            "Many Palm Springs homes are second homes or vacation rentals that sit closed for weeks at a time. A small leak that would be noticed in a day in a lived-in home can run for a whole summer in an empty one. We find the source, remove the affected materials and put the home back together so it is ready for the next visit or the next guest.",
        ],
        spots=[
            ("Flat and low-slope roofs", "Mid-century homes in neighborhoods like the Movie Colony, Twin Palms and Racquet Club Estates often have flat roofs. Ponding water and tired roof membranes leak into ceilings, and the mold grows above the drywall where you can't see it."),
            ("AC closets and condensate lines", "Air handlers in interior closets and attics drip constantly in summer. A clogged condensate line or a rusted drain pan soaks the closet floor and the wall behind it."),
            ("Homes closed for the season", "A supply line that fails while the home is empty can soak cabinets, baseboards and flooring for weeks before anyone opens the door."),
            ("Pool and patio doors", "Sliding doors and windows facing the pool take splash and irrigation water. Failed seals let it into the wall and under the flooring."),
        ],
        faqs=[
            ("My Palm Springs home sits empty all summer. How do I avoid coming back to mold?", "Most summer mold starts with a leak that runs while nobody is home, so prevention is mostly about water: shut the main water valve when you leave, have the AC condensate line cleared before summer, and have someone check the home every week or two. If you open the house to a musty smell, call before you clean anything so we can find the source first."),
            ("Can a flat roof leak cause mold in the ceiling?", "Yes. Water from a flat or low-slope roof leak spreads across the top of the ceiling drywall and insulation before it shows as a stain. By the time you see a spot, the area above it is often larger. We open the ceiling only as far as needed, remove the wet material, dry the space and repair the ceiling, and we can coordinate the roof repair so it doesn't happen again."),
            ("Do you work on vacation rentals in Palm Springs?", "Yes, as long as it is a residential home. We can work around your booking calendar, keep the work area sealed off and give you a clear timeline so you know when the home can take guests again."),
        ]),
    "palm-desert": dict(
        h2="Mold in Palm Desert homes: AC water, irrigation and empty seasons",
        lead="Palm Desert's country club and HOA homes, many closed up for the summer, are where AC overflow and irrigation water turn into hidden mold.",
        intro=[
            "Palm Desert has a large number of seasonal residents and country club homes that are closed up from late spring to fall. The AC keeps running to protect the house, and that means a steady stream of condensate water. If the drain line clogs or the pan rusts through, the water goes into the closet, the wall and the subfloor, often for months before anyone notices.",
            "The other common source is outside: sprinklers and drip lines that soak the stucco and the base of the walls day after day. Water that gets behind the stucco or under the slab edge can show up indoors as damp baseboards and a musty smell. We trace the water back to where it starts, fix it, remove the mold and rebuild the damaged area.",
        ],
        spots=[
            ("Air handler closets", "Overflowing condensate pans are one of the most common causes of mold we see in summer, especially in homes where nobody is there to hear the drip."),
            ("Walls next to landscaping", "Sprinklers aimed at the house, or planters built against the wall, keep the stucco wet. Over time that moisture reaches the framing and the drywall inside."),
            ("Laundry rooms and water heaters", "Washer hoses and water heaters in closets and garages fail without warning. A small, slow leak is worse than a burst one because it goes unnoticed."),
            ("Guest bathrooms", "Showers that are only used a few times a year still need ventilation. Steam with no exhaust fan, plus cracked grout, lets moisture into the wall behind the tile."),
        ],
        faqs=[
            ("Can my HOA or country club require mold work to be done a certain way?", "Some HOAs have rules about contractor hours, parking and work vehicles, and some require notice before work starts. Let us know your community's rules at the estimate and we'll plan the job around them."),
            ("I found water on the floor of my AC closet. Is that mold?", "Not necessarily, but it is the kind of water that leads to mold if it has been happening for a while. Shut off the AC if water is still coming out, take photos, and have it looked at. We check the drywall, baseboard and subfloor with a moisture meter to see how far the water went."),
            ("Can sprinklers really cause mold inside the house?", "Yes. When water hits the same wall every day, it can get behind the stucco or wick up the base of the wall. Inside, it shows up as peeling paint, swollen baseboards or a musty smell along an outside wall. We fix the inside and tell you exactly what to change outside so it stays dry."),
        ]),
    "cathedral-city": dict(
        h2="Cathedral City homes: older plumbing, swamp coolers and slab leaks",
        lead="Older plumbing, evaporative coolers and slab leaks are behind most of the mold we find in Cathedral City homes.",
        intro=[
            "A lot of Cathedral City's homes were built in the 1970s, 80s and 90s, and many still have original supply lines, shutoff valves and drain lines. As those parts age, small leaks start inside walls and under cabinets. In the desert they can go a long time without being noticed, because the house never feels damp the way it would in a humid climate.",
            "Some homes still use evaporative (swamp) coolers, which push moist air into the house by design. That is fine when everything is working, but a leaking cooler, a bad roof jack or a duct that sweats can wet the ceiling and the attic. We find where the water is coming from before we remove anything, so the mold doesn't come back.",
        ],
        spots=[
            ("Under kitchen and bathroom sinks", "Old shutoff valves and braided lines drip slowly into the cabinet base. The particleboard soaks it up, swells and grows mold underneath."),
            ("Swamp cooler roof penetrations", "Where the cooler sits on the roof and the duct passes through, worn seals let water into the attic and the ceiling below."),
            ("Slab leaks", "A leaking pipe under the slab can wet flooring and the bottom of the walls from below. Warm spots on the floor or a water bill that keeps rising are common signs."),
            ("Bathrooms without exhaust fans", "Many older bathrooms were built without a fan, or with one that vents into the attic. The moisture has nowhere to go."),
        ],
        faqs=[
            ("I have a swamp cooler. Does that mean I'll get mold?", "No. A cooler that is maintained and properly sealed adds humidity, but it isn't a leak. Problems start when the cooler or its roof penetration leaks, or the ducts drip. If you see stains on the ceiling near a vent, have it checked."),
            ("How do I know if I have a slab leak?", "Common signs are a water bill that goes up for no reason, the sound of running water when everything is off, a warm spot on the floor, or damp carpet and baseboards near the bottom of a wall. We find where the water is, fix the leak and take care of any wet or moldy materials."),
            ("Do you replace the cabinets if there is mold under the sink?", "If the cabinet base is soaked or moldy, we remove it, dry and clean the area, and replace what was damaged. We can match the existing cabinets as closely as possible or replace the full vanity if you want an upgrade at the same time."),
        ]),
    "indio": dict(
        h2="Indio's heat keeps the AC running, and the AC makes water",
        lead="In Indio, AC systems run so hard in summer that condensate overflow is one of the most common causes of mold we see.",
        intro=[
            "Indio is one of the hottest cities in the valley, and AC systems there can run most of the day for months. An AC that runs that much makes a lot of water as it pulls moisture out of the air. When the condensate line clogs or the pan cracks, the water has to go somewhere, usually into the closet floor, the wall or the ceiling below an attic unit.",
            "Many neighborhoods, from Terra Lago to the country club communities, were built in the 2000s, and those homes are now old enough for water heaters, supply lines and window seals to start failing. Festival-season rentals add another risk: busy weeks of heavy use, then long stretches where nobody is home to notice a leak.",
        ],
        spots=[
            ("Attic and closet AC units", "A clogged condensate line on an attic unit drips into the ceiling. On closet units it soaks the floor and the bottom of the walls."),
            ("Water heaters", "Water heaters from the original build are reaching the end of their life, and a slow leak at the base can wet the garage wall or the closet."),
            ("Window frames", "Hot outside, cold inside: on aluminum frames and failed dual-pane windows, condensation runs down onto the sill and the drywall below."),
            ("Short-term rentals between festivals", "A leak that starts the week after the festival can run for a long time before the next guest arrives."),
        ],
        faqs=[
            ("How often should I have my AC condensate line cleared in Indio?", "At least once a year, ideally before summer. Many units have a safety switch that shuts the AC off when the pan fills; if yours shuts off on a hot day, check the pan before you call for repair."),
            ("We rent our Indio home during festival season. How fast can mold be handled?", "It depends on how far the water spread, but we give you a clear timeline at the estimate. Small areas can often be handled quickly; larger areas with rebuild take longer. We keep the work area sealed off so the rest of the home stays usable."),
            ("Is the black spotting around my window frames mold?", "It can be. Condensation on window frames feeds mold on the sill, the caulk and the drywall below. We clean or replace the affected materials, and if the windows themselves are failing we can replace them too."),
        ]),
    "desert-hot-springs": dict(
        h2="Hot water, spa rooms and older homes in Desert Hot Springs",
        lead="Spa rooms, hot tubs and older homes with swamp coolers make Desert Hot Springs a little different when it comes to mold.",
        intro=[
            "Desert Hot Springs is known for its hot mineral water, and many homes have hot tubs, spa rooms or indoor pools. Warm water in an enclosed room adds a lot of humidity, and without enough ventilation that moisture settles on the ceiling, the walls and inside the framing.",
            "The city also has many older homes and small rentals with original plumbing, evaporative coolers and roofs that have seen a lot of wind-driven rain. We look at the whole picture: where the water comes from, how the room is vented and what needs to be removed and rebuilt.",
        ],
        spots=[
            ("Spa rooms and enclosed hot tubs", "Warm, humid air condenses on cooler surfaces. Ceilings and exterior walls in these rooms are the first place mold shows up."),
            ("Swamp cooler ducts and roof jacks", "Evaporative coolers that leak at the roof or ducts that drip can wet the attic and ceiling."),
            ("Wind-driven rain", "Strong winds push rain sideways into window frames, door thresholds and stucco cracks on the windward side of the house."),
            ("Older bathrooms", "Original tile and tub surrounds with cracked grout let water into the wall every time the shower runs."),
        ],
        faqs=[
            ("I have a hot tub in an enclosed room. How do I keep mold out?", "Ventilation is the main thing: an exhaust fan sized for the room, a cover on the tub when it's not in use, and moisture-resistant materials on the walls and ceiling. If mold is already there, we remove the affected materials and can rebuild with better-suited materials and ventilation."),
            ("Do you work on rental homes in Desert Hot Springs?", "Yes, on residential homes. If you have tenants, we can explain the work and the schedule and plan the job so the home stays livable where possible."),
            ("My ceiling stain only appears after windy storms. Why?", "Wind-driven rain gets into places normal rain doesn't, like the edges of roof jacks, window heads and stucco cracks. We trace it back to the entry point, fix it, and take care of any mold and water damage inside."),
        ]),
    "yucca-valley": dict(
        h2="High desert winters bring a different kind of water damage",
        lead="Freezing pipes, snow and winter rain make mold in Yucca Valley homes more seasonal than in the low desert.",
        intro=[
            "Yucca Valley gets real winters, with freezing nights and the occasional snow. Pipes in exterior walls, crawl spaces and unheated garages can freeze and split, and the leak often doesn't show until the weather warms up. Snow and heavy rain sitting on older roofs find their way into the attic.",
            "Many homes here are older, some with crawl spaces, and many are cabins or vacation rentals that sit empty between visits. That combination means water can sit for a long time before it's found. We dry it out, remove what is damaged and rebuild, and we fix the reason the water got in.",
        ],
        spots=[
            ("Frozen and split pipes", "Pipes in outside walls, under the house or in garages are the usual suspects after a hard freeze."),
            ("Crawl spaces", "Plumbing leaks, poor drainage around the foundation and no vapor barrier can keep a crawl space damp, which affects the floor above."),
            ("Roofs after snow and rain", "Older roofs and flashings let melting snow and rain into the attic insulation and ceiling."),
            ("Cabins and vacation rentals", "Homes that sit empty between guests can have a leak running for days or weeks."),
        ],
        faqs=[
            ("How do I protect my Yucca Valley home from frozen pipes?", "Keep the heat on at a low setting when you're away, insulate pipes in exterior walls, crawl spaces and garages, and know where your main shutoff is. For homes that sit empty in winter, shutting off and draining the water is the safest option."),
            ("Can you work in crawl spaces?", "Yes. We check crawl spaces for standing water, plumbing leaks and mold on the framing, clean and treat the affected areas, and can add a vapor barrier and fix drainage so the space stays dry."),
            ("My cabin smelled musty when I came back. What should I do first?", "Open it up, don't run the AC or heat if it blows the musty smell around, and look for obvious water under sinks and around the water heater. Then call us. Don't start scrubbing until the source is found, because cleaning without fixing the leak only buys time."),
        ]),
    "twentynine-palms": dict(
        h2="Monsoon storms, winter freezes and rental homes in Twentynine Palms",
        lead="Summer monsoon storms and winter freezes are behind most of the water damage and mold we see in Twentynine Palms homes.",
        intro=[
            "Twentynine Palms gets sudden summer monsoon storms with heavy rain in a short time, plus cold winter nights. Roofs that have dried out in the sun, gutters packed with dust and grading that sends water toward the house all add up to water getting into ceilings and walls.",
            "Many homes in town are rentals, and many are older homes with crawl spaces. Tenants may not report a small stain right away, and owners who live elsewhere may not see it at all. We find the water, fix the cause, remove the mold and leave the home ready for the next family.",
        ],
        spots=[
            ("Roofs after monsoon storms", "A short, heavy storm can overwhelm worn flashing and dry, cracked roofing. The ceiling stain often appears days later."),
            ("Grading and drainage", "Yards that slope toward the house send storm water against the foundation and into crawl spaces."),
            ("Frozen pipes", "Pipes under the house and in exterior walls can split on the coldest nights and leak when they thaw."),
            ("Rental homes between tenants", "Move-out is a good time to check under sinks, behind the washer and around the water heater for slow leaks."),
        ],
        faqs=[
            ("I own a rental in Twentynine Palms but live elsewhere. Can you handle it?", "Yes. We can do the estimate with your tenant or property manager there, send you photos and a written scope, and keep you updated through the job."),
            ("Why did my ceiling stain show up days after the storm?", "Water from a roof leak soaks the insulation and spreads across the top of the drywall before it comes through. That's why stains often show up later and are larger than the actual leak. We dry or replace the wet material before mold sets in."),
            ("Does the desert heat dry everything out on its own?", "Outside, quickly. Inside a wall, ceiling or crawl space, not reliably. Trapped water can stay wet long enough for mold to grow, which is why water-damaged areas should be dried and checked within a day or two."),
        ]),
    "yucaipa": dict(
        h2="More rain, hillsides and crawl spaces in Yucaipa",
        lead="Yucaipa gets more rain than the desert cities, and hillside lots, crawl spaces and older roofs make that rain a mold risk.",
        intro=[
            "Yucaipa sits in the foothills and gets noticeably more winter rain than the desert. Hillside lots send water down toward houses, older homes often have crawl spaces, and roofs and gutters take a beating in winter storms. When water gets under the house or into the attic, it can stay there.",
            "Cooler, wetter winters also mean more condensation on windows and in bathrooms when homes are closed up and heated. We look for the source of the water, fix it, remove the affected materials and rebuild so the problem doesn't return next winter.",
        ],
        spots=[
            ("Crawl spaces and under-floor areas", "Water draining off a hillside or out of a downspout can collect under the house and keep the framing damp."),
            ("Roofs and gutters after winter storms", "Clogged gutters overflow behind the fascia and into the walls and attic."),
            ("Window condensation", "In closed-up winter homes, water forms on cold window glass and frames and soaks the sills and drywall."),
            ("Bathrooms and laundry rooms", "Steam with poor ventilation and leaking washer hoses are steady sources of indoor moisture."),
        ],
        faqs=[
            ("Water collects under my house when it rains. Is that a mold problem?", "It can become one. Standing water or damp soil in a crawl space keeps the air under the house humid, and the floor framing can grow mold. We clean and treat what's affected and can fix the drainage and add a vapor barrier."),
            ("Can clogged gutters cause mold inside?", "Yes. When gutters overflow, water runs behind the fascia, down the wall and sometimes into the attic or the top of the wall. We fix the damage inside and can repair or replace the gutters so the water goes where it should."),
            ("Why do my windows drip in the winter?", "Warm, moist indoor air hitting cold glass forms condensation. Running bathroom and kitchen fans, keeping some air moving and upgrading old single-pane windows all help. If the sills and walls under the windows are already moldy, we clean or replace them."),
        ]),
    "san-bernardino": dict(
        h2="Older homes and aging plumbing in San Bernardino",
        lead="San Bernardino has many older homes with aging plumbing and roofs, and that's where most of the mold we find here starts.",
        intro=[
            "A large share of San Bernardino's homes were built between the 1920s and the 1970s. Galvanized and cast iron pipes corrode from the inside, old roofs and flashings wear out, and many homes have crawl spaces or raised floors. Leaks in older homes are often slow and hidden, which is exactly when mold has time to grow.",
            "Older homes can also contain materials like asbestos or lead paint that need to be handled carefully before walls and ceilings are opened. We check for that first and plan the work accordingly, then remove the mold, fix the leak and rebuild.",
        ],
        spots=[
            ("Old supply and drain lines", "Corroded galvanized pipes and cast iron drains leak inside walls and under floors."),
            ("Raised floors and crawl spaces", "Plumbing leaks and poor drainage keep the area under the house damp."),
            ("Aging roofs", "Worn shingles and flashing let winter rain into the attic and the tops of walls."),
            ("Bathrooms and kitchens", "Original tile, tub surrounds and sink areas with failed caulk and grout let water into the wall."),
        ],
        faqs=[
            ("My San Bernardino home is old. Do you check for asbestos before opening walls?", "In older homes, some materials like certain drywall compounds, ceiling textures, flooring and insulation can contain asbestos. When the home's age calls for it, those materials need to be tested before they are disturbed, and we plan the work around the results."),
            ("I smell something musty but can't see any mold. What now?", "A musty smell with no visible mold usually means it is inside a wall, under the floor or in the attic. We use moisture readings and a careful inspection to find it, and testing if needed, before opening anything."),
            ("Should I replace my old pipes while you're fixing the mold?", "If the leak came from corroded pipes, it's often worth replacing the affected section, or more, while the walls are already open. We'll show you what we find and you decide."),
        ]),
    "moreno-valley": dict(
        h2="Tract homes, water heaters and slow leaks in Moreno Valley",
        lead="Moreno Valley's 1980s to 2000s homes are reaching the age where water heaters, supply lines and window seals start to leak.",
        intro=[
            "Many Moreno Valley homes were built in the 1980s, 90s and 2000s. That makes them old enough for the original water heaters, washer hoses, toilet supply lines and window seals to start failing. Most of the mold we find here comes from one of those slow leaks, usually in a garage, a closet or under a sink.",
            "Stucco cracks and sprinklers aimed at the walls add another source from the outside. We find the water, repair it, remove the mold and damaged materials, and rebuild so you're left with a finished room, not open walls.",
        ],
        spots=[
            ("Garage and closet water heaters", "A leak at the base of an older water heater soaks the drywall and the bottom plate of the wall."),
            ("Washer and toilet supply lines", "Hoses and lines that are 15 or 20 years old can leak or burst without warning."),
            ("Stucco cracks and sprinklers", "Water from sprinklers and rain can get in through cracks and reach the framing."),
            ("Upstairs bathrooms", "A leaking shower pan or toilet seal upstairs shows up as a stain on the ceiling below."),
        ],
        faqs=[
            ("There's a stain on my ceiling under the upstairs bathroom. What causes that?", "Usually a leaking shower pan, tub drain, toilet seal or supply line. We find which one it is, fix it, open the ceiling only as much as needed, remove the wet or moldy material and repair the ceiling."),
            ("How long do water heaters and washer hoses last?", "It varies, but many tank water heaters are replaced somewhere around 10 to 15 years, and rubber washer hoses should be checked regularly and replaced when worn. Braided stainless hoses are a good upgrade."),
            ("Do you fix the drywall and paint after removing mold?", "Yes. We remove the mold and damaged materials, then rebuild: drywall, texture, paint, baseboards and flooring if needed, so the room is finished when we leave."),
        ]),
    "menifee": dict(
        h2="Newer homes, tight construction and indoor moisture in Menifee",
        lead="Menifee has both newer, tightly sealed homes and established communities like Sun City, and both can trap indoor moisture.",
        intro=[
            "Newer homes are built tight to save energy, which is good for your bills but means moisture from showers, cooking and laundry stays inside unless the fans are used. In homes where bathroom fans don't run long enough, or vent into the attic, that moisture ends up on ceilings and in closets.",
            "Menifee also has established neighborhoods like Sun City, with homes from the 1960s to 1980s where aging plumbing and roofs are the bigger risk. Whatever the age of the home, we find the moisture source first, then remove the mold and rebuild.",
        ],
        spots=[
            ("Bathroom ceilings and closets", "Steam that isn't vented out settles in the coolest spots, often the ceiling corners and inside closets on exterior walls."),
            ("Bath fans venting into the attic", "A fan that blows into the attic instead of outside moves the moisture into the insulation."),
            ("Older plumbing in established neighborhoods", "In older homes, supply lines, drains and water heaters are common leak sources."),
            ("Landscape irrigation", "Drip and spray irrigation against the foundation can wet the base of exterior walls."),
        ],
        faqs=[
            ("My home is only a few years old. How can it have mold?", "New homes can get mold from a construction defect, a leak, or simply indoor moisture with nowhere to go. A shower used daily without a working fan is enough. We find the cause, which matters if it's something the builder should fix."),
            ("Do you work in 55+ communities like Sun City?", "Yes. We can work around community rules and keep the work area sealed and tidy, and we explain everything clearly before we start."),
            ("How long should I run my bathroom fan?", "Run it during the shower and for about 20 minutes after. If the mirror and walls stay wet long after, the fan may be too small, blocked or venting into the attic."),
        ]),
    "murrieta": dict(
        h2="Big storms, irrigation and newer homes in Murrieta",
        lead="In Murrieta, mold usually traces back to heavy winter storms, landscape irrigation or a slow plumbing leak in a newer home.",
        intro=[
            "Murrieta gets most of its rain in a few winter storms, and some of them are heavy. Water that sits against the house, overflows gutters or finds a weak spot in the roof can get into walls and ceilings. In a dry climate, that wet area may not dry out on its own once it's inside.",
            "Many Murrieta homes are newer and well sealed, so indoor moisture from bathrooms and laundry stays inside. Lush landscaping with daily irrigation is common too. We find the source, fix it, remove the mold and rebuild.",
        ],
        spots=[
            ("Walls next to irrigated landscaping", "Sprinklers and drip lines that hit the house keep stucco and the base of the walls damp."),
            ("Roofs and gutters after big storms", "Heavy rain overwhelms clogged gutters and weak flashing."),
            ("Upstairs laundry rooms", "A washer leak upstairs can soak the floor and the ceiling of the room below."),
            ("Bathrooms", "Poor ventilation and failed caulk and grout let moisture into the walls."),
        ],
        faqs=[
            ("My laundry room is upstairs. What happens if the washer leaks?", "Water goes through the floor into the ceiling below quickly. Shut off the water, turn off the washer, and call. We dry the floor and ceiling, remove anything that's wet past saving, and rebuild. A washer drain pan with a leak sensor is a good upgrade afterward."),
            ("Can heavy rain cause mold even if my roof doesn't leak?", "Yes. Overflowing gutters, water pooling against the house and wind-driven rain at windows and doors can all wet the walls without a roof leak. We look at the whole outside of the home to find where the water got in."),
            ("Will the mold come back after you remove it?", "Not if the moisture source is fixed and the area is properly dried. That's why we always find and fix the water first."),
        ]),
    "temecula": dict(
        h2="Marine air, hillside lots and irrigation in Temecula",
        lead="Temecula is cooler and more humid than the desert, and hillside lots and irrigated landscaping add to the moisture around its homes.",
        intro=[
            "Temecula gets cool, damp mornings when marine air reaches the valley, so homes here see more humidity than the desert cities. Combined with irrigation, pools and hillside lots that send rain toward the house, there is more moisture around Temecula homes than most people expect.",
            "From newer tract homes to larger homes in wine country, the pattern is the same: find where the water is coming from, fix it, remove the mold and rebuild the damaged area. We handle all of it, so you don't need separate companies for each step.",
        ],
        spots=[
            ("Hillside drainage", "Rain running down a slope collects against the uphill side of the house and can reach the walls and slab edge."),
            ("Pools and irrigation", "Pool splash, overspray and constant irrigation keep the walls and doors on that side of the house wet."),
            ("Closets and corners on exterior walls", "Cool exterior walls with poor air circulation are where condensation and mold show up first."),
            ("Bathrooms and kitchens", "Steam, leaking sink lines and failed caulk are common indoor sources."),
        ],
        faqs=[
            ("Why is there mold in my closet on an outside wall?", "Exterior closets stay cooler and get little air movement. When indoor air is humid, moisture condenses on the cool wall. Keeping the door open sometimes, not packing it tight, and fixing any outside water source helps. If mold is already there, we clean or remove the affected materials."),
            ("Do you work on larger homes and properties in Temecula wine country?", "Yes, on residential homes of any size. We'll walk the whole property at the estimate, including the drainage and irrigation around the house."),
            ("My stucco has cracks. Could that be letting water in?", "It can. Hairline cracks are common, but larger cracks or cracks near windows and doors can let rain and irrigation water behind the stucco. We check the wall inside with a moisture meter and repair the outside if water is getting in."),
        ]),
}

# Questions shared by every city page (two are added to each city's own three).
SHARED_FAQS = [
    ("What affects the cost of mold removal?", "The cost depends on your home: how large the affected area is, which materials are involved (drywall, insulation, cabinets, flooring), how hard it is to reach, whether testing is needed, what it takes to fix the water source, and how much rebuilding is needed afterward. Because no two homes are the same, we don't publish one-size-fits-all prices. We'll visit your home, inspect, and give you personalized pricing with a free on-site estimate. Call or text " + PHONE + "."),
    ("Can I just clean mold with bleach?", "On a small spot on a hard surface, like tile, cleaning is often fine. On porous materials like drywall, wood and insulation, bleach doesn't reach the mold growing inside the material, and the moisture problem is still there. The EPA's guidance is to fix the water problem, clean hard surfaces, and remove porous materials that are moldy. For areas larger than about 10 square feet, a professional is recommended."),
]


def city_page(shell_top, shell_footer, slug, name, nearby):
    c = CITY[slug]
    faqs = c["faqs"] + SHARED_FAQS
    others = [("roofing", "Roofing", "home"), ("plumbing", "Plumbing", "droplet"), ("insulation", "Insulation", "wind"),
              ("bathroom-remodeling", "Bathroom Remodeling", "box"), ("windows", "Windows", "square"), ("gutters", "Gutters", "cloud-rain")]
    other_links = "\n".join(
        f'              <a class="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-3 hover:border-brand hover:text-brand transition" href="/{s}/{slug}/"><i data-feather="{icon}" class="w-4 h-4 flex-shrink-0"></i>{label} in {name}</a>'
        for s, label, icon in others if os.path.exists(os.path.join(ROOT, s, slug, "index.html")))
    nearby_links = "\n".join(
        f'              <a href="/mold-removal/{n}/" class="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-3 hover:border-brand hover:text-brand transition"><i data-feather="map-pin" class="w-4 h-4 flex-shrink-0"></i>{NAMES[n]}</a>'
        for n in nearby)
    spots = "\n".join(
        f'''            <li class="flex items-start gap-3">
              <i data-feather="check" class="w-5 h-5 text-brand2 mt-0.5 flex-shrink-0"></i>
              <span><strong>{t}</strong>: {d}</span>
            </li>''' for t, d in c["spots"])
    faq_html = "\n".join(
        f'''            <details class="border border-line rounded-2xl bg-white p-5">
              <summary class="font-semibold cursor-pointer">{q}</summary>
              <p class="text-muted mt-3 text-sm">{a}</p>
            </details>''' for q, a in faqs)
    title = f"Mold Removal in {name}, CA | Omdan Development"
    desc = f"Mold inspection, testing, removal and repair in {name}, CA. We fix the water source and rebuild. Free on-site estimate. CSLB #1148568."
    url = f"{BASE}/mold-removal/{slug}/"
    service = json.dumps({
        "@context": "https://schema.org", "@type": "Service",
        "name": f"Mold Removal in {name}",
        "serviceType": "Residential mold remediation",
        "description": f"Residential mold inspection and testing, containment and removal, water source repair and rebuild for homes in {name}, CA.",
        "provider": {"@type": "LocalBusiness", "name": "Omdan Development Inc", "telephone": "+1-951-292-0703",
                     "url": BASE + "/", "hasCredential": "CSLB License #1148568"},
        "areaServed": {"@type": "City", "name": name,
                       "sameAs": "https://en.wikipedia.org/wiki/" + name.replace(" ", "_") + ",_California"},
        "url": url,
    }, indent=2, ensure_ascii=False)
    crumbs = json.dumps({
        "@context": "https://schema.org", "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": BASE + "/"},
            {"@type": "ListItem", "position": 2, "name": "Mold Removal", "item": BASE + "/mold-removal/"},
            {"@type": "ListItem", "position": 3, "name": name, "item": url},
        ]}, indent=2, ensure_ascii=False)
    intro = "\n".join(f'          <p class="mt-3 text-muted">{p}</p>' for p in c["intro"])
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-EWYZ2LSMHR"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){{dataLayer.push(arguments);}}
  gtag('js', new Date());
  gtag('config', 'G-EWYZ2LSMHR');
  gtag('config', 'AW-17862403534');
</script>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{title}</title>
  <meta name="description" content="{desc}" />
  <link rel="canonical" href="{url}" />
  <meta name="theme-color" content="#0f172a" />
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{desc}">
  <meta property="og:url" content="{url}">
  <meta property="og:type" content="website">
  <meta property="og:image" content="{BASE}/assets/15-og.webp">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/styles.css">
  <script src="/assets/feather.min.js" defer></script>
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="alternate icon" href="/assets/favicon.ico">
  <style>
    .no-scrollbar::-webkit-scrollbar {{ display: none; }}
    .no-scrollbar {{ -ms-overflow-style: none; scrollbar-width: none; }}
  </style>

  <script type="application/ld+json">
{service}
  </script>

  <script type="application/ld+json">
{faq_schema(faqs)}
  </script>

  <script type="application/ld+json">
{crumbs}
  </script>
</head>
<body class="bg-white text-ink font-sans overflow-x-hidden">

{shell_top}  <!-- Breadcrumb header -->
  <header class="border-b border-line bg-slate-50">
    <div class="max-w-7xl mx-auto px-5 py-12">
      <nav class="text-sm text-muted mb-3" aria-label="Breadcrumb">
        <ol class="flex items-center gap-1.5 flex-wrap">
          <li><a href="/" class="hover:text-brand transition">Home</a></li>
          <li aria-hidden="true">›</li>
          <li><a href="/mold-removal/" class="hover:text-brand transition">Mold Removal</a></li>
          <li aria-hidden="true">›</li>
          <li class="text-ink font-medium" aria-current="page">{name}</li>
        </ol>
      </nav>
      <h1 class="mt-2 text-3xl sm:text-4xl font-extrabold">Mold Removal in {name}, CA</h1>
      <p class="mt-3 text-muted max-w-2xl">{c["lead"]} One licensed team for inspection and testing, removal, fixing the water source and rebuilding. CSLB #1148568.</p>
      <div class="mt-6 flex flex-col sm:flex-row gap-3">
        <a href="/?service=mold#contact" class="inline-flex items-center justify-center bg-brand text-white px-6 py-3 rounded-lg font-semibold hover:opacity-95 transition">Get a Free On-Site Estimate</a>
        <a href="tel:9512920703" class="inline-flex items-center justify-center bg-ink text-white px-6 py-3 rounded-lg font-semibold hover:opacity-95 transition">Call {PHONE}</a>
      </div>
    </div>
  </header>

  <!-- Main content -->
  <main class="max-w-7xl mx-auto px-5 py-12">
    <div class="grid lg:grid-cols-3 gap-10">
      <div class="lg:col-span-2 space-y-10">

        <!-- Intro -->
        <section>
          <h2 class="text-2xl font-bold">{c["h2"]}</h2>
{intro}
        </section>

        <!-- Where we find it -->
        <section>
          <h2 class="text-xl font-bold">Where we find mold in {name} homes</h2>
          <ul class="mt-4 space-y-3 text-muted">
{spots}
          </ul>
        </section>

        <!-- Process -->
        <section>
          <h2 class="text-xl font-bold">How we handle mold in {name}</h2>
          <div class="mt-4 grid sm:grid-cols-2 gap-4">
            <div class="rounded-2xl border border-line bg-white p-5">
              <p class="text-sm font-semibold text-brand mb-2">1. Inspect and test</p>
              <p class="text-muted text-sm">We look at the affected area, take moisture readings to see how far the water went, and test when it helps answer a question. If you already have a report from an independent inspector, we work from it.</p>
            </div>
            <div class="rounded-2xl border border-line bg-white p-5">
              <p class="text-sm font-semibold text-brand mb-2">2. Find and fix the water</p>
              <p class="text-muted text-sm">Mold comes back if the moisture does. We find the leak, condensation or drainage problem and fix it as part of the job.</p>
            </div>
            <div class="rounded-2xl border border-line bg-white p-5">
              <p class="text-sm font-semibold text-brand mb-2">3. Contain and remove</p>
              <p class="text-muted text-sm">We seal off the work area, remove moldy drywall, insulation and other porous materials, and clean the remaining surfaces with HEPA vacuums and an antimicrobial treatment.</p>
            </div>
            <div class="rounded-2xl border border-line bg-white p-5">
              <p class="text-sm font-semibold text-brand mb-2">4. Dry, check and rebuild</p>
              <p class="text-muted text-sm">We confirm the area is dry before closing it up, then rebuild: drywall, insulation, paint, baseboards, cabinets or flooring, so the room is finished when we leave.</p>
            </div>
          </div>
        </section>

        <!-- FAQ -->
        <section>
          <h2 class="text-xl font-bold">{name} mold removal FAQ</h2>
          <div class="mt-4 space-y-4">
{faq_html}
          </div>
        </section>

        <!-- Cross-links -->
        <section>
          <div class="rounded-2xl border border-line bg-slate-50 p-6">
            <h2 class="text-xl font-bold">Related services in {name}</h2>
            <div class="mt-4 grid sm:grid-cols-2 gap-3 text-sm">
              <a class="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-3 hover:border-brand hover:text-brand transition" href="/mold-removal/"><i data-feather="shield" class="w-4 h-4 flex-shrink-0"></i>All Mold Removal Services</a>
{other_links}
            </div>
            <h3 class="font-bold mt-6 mb-3 text-sm">Mold removal in nearby cities</h3>
            <div class="flex flex-wrap gap-3 text-sm">
{nearby_links}
            </div>
          </div>
        </section>

      </div>

      <!-- Sidebar -->
      <aside class="space-y-5">
        <div class="rounded-2xl border border-line bg-white p-5">
          <h3 class="text-lg font-bold">Get a free mold estimate</h3>
          <p class="mt-2 text-sm text-muted">Every home is different. We'll visit, inspect and give you personalized pricing, free and with no obligation.</p>
          <div class="mt-4 flex flex-col gap-3">
            <a href="/?service=mold#contact" class="inline-flex items-center justify-center bg-brand text-white px-5 py-3 rounded-lg font-semibold hover:opacity-95 transition">Get a Free On-Site Estimate</a>
            <a href="tel:9512920703" class="inline-flex items-center justify-center bg-ink text-white px-5 py-3 rounded-lg font-semibold hover:opacity-95 transition">Call {PHONE}</a>
          </div>
          <p class="mt-3 text-xs text-muted">Class B General Building Contractor. Licensed, bonded &amp; insured. CSLB #1148568.</p>
        </div>
        <div class="rounded-2xl border border-line bg-white p-5">
          <h3 class="text-base font-bold">What we handle</h3>
          <ul class="mt-3 space-y-2 text-sm text-muted">
            <li class="flex items-center gap-2"><i data-feather="arrow-right" class="w-3.5 h-3.5 text-brand flex-shrink-0"></i>Mold inspection &amp; testing</li>
            <li class="flex items-center gap-2"><i data-feather="arrow-right" class="w-3.5 h-3.5 text-brand flex-shrink-0"></i>Containment &amp; mold removal</li>
            <li class="flex items-center gap-2"><i data-feather="arrow-right" class="w-3.5 h-3.5 text-brand flex-shrink-0"></i>Leak &amp; water source repair</li>
            <li class="flex items-center gap-2"><i data-feather="arrow-right" class="w-3.5 h-3.5 text-brand flex-shrink-0"></i>Drywall, insulation &amp; paint</li>
            <li class="flex items-center gap-2"><i data-feather="arrow-right" class="w-3.5 h-3.5 text-brand flex-shrink-0"></i>Cabinets &amp; flooring</li>
          </ul>
        </div>
        <div class="rounded-2xl border border-line bg-slate-50 p-5">
          <h3 class="text-base font-bold">Signs to call</h3>
          <p class="mt-2 text-sm text-muted">A musty smell, stains or spotting on walls or ceilings, peeling paint, swollen baseboards, or a leak that wasn't dried within a day or two.</p>
        </div>
      </aside>
    </div>
  </main>

{shell_footer}'''


def city_shell(slug_for_mobile="mold"):
    src = read("insulation/indio/index.html")
    top = between(src, "  <!-- Top bar -->", "  <!-- Breadcrumb header -->")
    foot = between(src, "  <!-- Footer -->")
    foot = foot.replace("?service=insulation", "?service=" + slug_for_mobile)
    foot = re.sub(r'<h4 class="font-bold mb-3">Services</h4>\s*<ul class="space-y-2 text-white/75 text-sm">.*?</ul>',
                  '<h4 class="font-bold mb-3">Services</h4>\n          <ul class="space-y-2 text-white/75 text-sm">\n'
                  + "".join(f'            <li><a class="hover:text-white" href="/{s}/">{l}</a></li>\n' for s, l in
                            [("mold-removal", "Mold Removal"), ("roofing", "Roofing"), ("plumbing", "Plumbing"),
                             ("insulation", "Insulation"), ("bathroom-remodeling", "Bathroom Remodeling")])
                  + "          </ul>", foot, count=1, flags=re.S)
    foot = re.sub(r'<h4 class="font-bold mb-3">Insulation Cities</h4>\s*<ul class="space-y-2 text-white/75 text-sm">.*?</ul>',
                  '<h4 class="font-bold mb-3">Mold Removal Cities</h4>\n          <ul class="space-y-2 text-white/75 text-sm">\n'
                  + "".join(f'            <li><a class="hover:text-white" href="/mold-removal/{s}/">{NAMES[s]}</a></li>\n'
                            for s in ["palm-springs", "palm-desert", "indio", "cathedral-city", "moreno-valley", "temecula"])
                  + "          </ul>", foot, count=1, flags=re.S)
    assert "Mold Removal Cities" in foot and "/mold-removal/\">Mold Removal" in foot
    return top, foot


MAIN_FAQS = [
    ("How do I know if I have mold?", "The most common signs are a musty smell, dark spotting or staining on walls, ceilings or grout, peeling or bubbling paint, swollen baseboards, and any area that got wet and wasn't dried within a day or two. Mold often grows where you can't see it, inside walls, above ceilings and under cabinets, so a smell with no visible mold is still worth checking."),
    ("Do you test for mold?", "Yes. We inspect, take moisture readings and test when it helps answer a question, like whether mold is behind a wall or how far it spread. Testing isn't always needed when mold is clearly visible, and we'll tell you honestly when it is and isn't worth it. If you already have a report from an independent inspector, we work from that."),
    ("Can I just clean mold with bleach?", "On a small spot on a hard surface, like tile, cleaning is often fine. On porous materials like drywall, wood and insulation, bleach doesn't reach the mold growing inside the material, and the water problem is still there. The EPA's guidance is to fix the moisture problem, clean hard surfaces and remove porous materials that are moldy. For areas larger than about 10 square feet, the EPA recommends hiring a professional."),
    ("Will the mold come back?", "Not if the moisture source is fixed and the area is properly dried before it is closed up. That is why every job starts with finding the leak, condensation or drainage problem that caused the mold, and why we fix it as part of the work."),
    ("Can I stay in my home during mold removal?", "Usually yes. We seal off the work area with plastic sheeting and use HEPA air filtration so the rest of the home stays separate. For larger jobs, or if someone in the home has health concerns, we'll talk through whether certain rooms should be off-limits during the work."),
    ("Does homeowners insurance cover mold?", "It depends on your policy and what caused the mold. Damage from a sudden event, like a burst pipe, is often treated differently from damage caused by a long-term leak or lack of maintenance. Check with your insurance company. We can give you photos and a written scope of the work."),
    ("Do you rebuild after removing the mold?", "Yes. As a Class B general building contractor, we handle the whole job: removal, fixing the water source, and rebuilding the drywall, insulation, paint, baseboards, cabinets or flooring. You don't need a second company to put the room back together."),
    SHARED_FAQS[0],
]


def main_page():
    src = read("insulation/index.html")
    head_top = between(src, "  <!-- Top bar -->", "  <!-- HERO -->")
    tail = between(src, "  <!-- CONTACT -->")
    tail = tail.replace('data-service="insulation"', 'data-service="mold"')
    tail = tail.replace('value="Website: /insulation/"', 'value="Website: /mold-removal/"')
    if 'href="/mold-removal/">Mold Removal</a></li>' not in tail:
        tail = tail.replace('<li><a class="hover:text-white" href="/hvac/">HVAC</a></li>',
                            '<li><a class="hover:text-white" href="/hvac/">HVAC</a></li>\n            <li><a class="hover:text-white" href="/mold-removal/">Mold Removal</a></li>')
    tail = re.sub(r'<h4 class="font-bold mb-3">Insulation Cities</h4>\s*<ul class="space-y-2 text-white/75 text-sm">.*?</ul>',
                  '<h4 class="font-bold mb-3">Mold Removal Cities</h4>\n          <ul class="space-y-2 text-white/75 text-sm">\n'
                  + "".join(f'            <li><a class="hover:text-white" href="/mold-removal/{s}/">{NAMES[s]}</a></li>\n'
                            for s in ["palm-springs", "palm-desert", "indio", "cathedral-city", "san-bernardino", "moreno-valley"])
                  + "          </ul>", tail, count=1, flags=re.S)
    assert 'data-service="mold"' in tail and "Mold Removal Cities" in tail and 'value="mold"' in tail, \
        "contact form needs the mold chip (run add_mold_chip first)"
    areas = "\n".join(f'        <a href="/mold-removal/{s}/" class="hover:text-brand hover:underline">{n}</a>'
                      for s, n in sorted(NAMES.items(), key=lambda x: x[1]))
    faqs = MAIN_FAQS
    faq_html = "\n".join(f'''        <details class="bg-soft rounded-2xl border border-line p-5">
          <summary class="font-bold cursor-pointer text-ink list-none flex justify-between items-center">
            {q}
            <i data-feather="chevron-down" class="w-5 h-5 text-muted flex-shrink-0"></i>
          </summary>
          <p class="mt-3 text-gray-700">{a}</p>
        </details>''' for q, a in faqs)
    service = json.dumps({
        "@context": "https://schema.org", "@type": "Service",
        "name": "Mold Removal and Remediation",
        "serviceType": "Residential mold remediation",
        "provider": {"@type": "LocalBusiness", "name": "Omdan Development Inc", "telephone": "+1-951-292-0703",
                     "url": BASE + "/", "hasCredential": "CSLB License #1148568"},
        "areaServed": [{"@type": "City", "name": n} for _, n, _ in CITIES],
        "description": "Residential mold inspection and testing, containment and removal, water source repair and rebuild for homes in Palm Springs, the Coachella Valley, the High Desert and the Inland Empire.",
        "url": BASE + "/mold-removal/",
    }, indent=2, ensure_ascii=False)
    crumbs = json.dumps({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Home", "item": BASE + "/"},
        {"@type": "ListItem", "position": 2, "name": "Mold Removal", "item": BASE + "/mold-removal/"}]},
        indent=2, ensure_ascii=False)
    title = "Mold Removal &amp; Remediation in Palm Springs | Omdan"
    desc = "Mold inspection, testing, removal and repair for homes in Palm Springs, the Coachella Valley and Inland Empire. We fix the leak and rebuild. Free on-site estimate."
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-EWYZ2LSMHR"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){{dataLayer.push(arguments);}}
  gtag('js', new Date());
  gtag('config', 'G-EWYZ2LSMHR');
  gtag('config', 'AW-17862403534');
</script>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="canonical" href="{BASE}/mold-removal/">

  <title>{title}</title>
  <meta name="description" content="{desc}" />
  <meta name="theme-color" content="#0f172a" />

  <!-- Open Graph -->
  <meta property="og:title" content="{title}" />
  <meta property="og:description" content="{desc}">
  <meta property="og:url" content="{BASE}/mold-removal/">
  <meta property="og:type" content="website">
  <meta property="og:image" content="{BASE}/assets/15-og.webp">
  <meta name="twitter:card" content="summary_large_image">

  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600;700&display=swap" rel="stylesheet">

  <!-- Tailwind compiled -->
  <link rel="stylesheet" href="/assets/styles.css">
  <link rel="stylesheet" href="/assets/booking.css?v=2">

  <!-- Icons -->
  <script src="/assets/feather.min.js" defer></script>

  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="alternate icon" href="/assets/favicon.ico">

  <style>
    .hero {{ background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); }}
    .title-accent{{ position:relative; display:inline-block; padding-bottom:.55rem; }}
    .title-accent::after{{
      content:""; position:absolute; left:0; bottom:0;
      width:100%; height:3px; border-radius:999px;
      background: linear-gradient(90deg, #2563eb, #0ea5e9);
    }}
  </style>

  <script type="application/ld+json">
{service}
  </script>

  <script type="application/ld+json">
{faq_schema(faqs)}
  </script>

  <script type="application/ld+json">
{crumbs}
  </script>
</head>

<body class="bg-white text-ink font-sans overflow-x-hidden">

{head_top}  <!-- HERO -->
  <header class="hero text-white">
    <div class="max-w-6xl mx-auto px-6 py-20 md:py-28 text-center">
      <h1 class="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">Mold Removal &amp; Remediation in Palm Springs, the Coachella Valley &amp; Inland Empire</h1>
      <p class="text-base md:text-lg text-white/90 max-w-3xl mx-auto">
        Inspection &amp; testing • Containment &amp; removal • Fixing the water source • Rebuilding, by one licensed team from start to finish.
      </p>
      <p class="text-sm text-white/80 mt-3">
        Homes only. Based in Palm Springs, serving the Coachella Valley, the High Desert and the Inland Empire.
      </p>
      <div class="mt-8 flex flex-col sm:flex-row gap-3 items-stretch justify-center">
        <a href="#contact" class="block w-full sm:w-auto bg-brand text-white px-7 py-3 rounded-lg font-bold hover:opacity-95 transition text-center">
          Get a Free On-Site Estimate
        </a>
        <a href="tel:9512920703" class="block w-full sm:w-auto bg-white/10 text-white px-7 py-3 rounded-lg font-bold border border-white/20 hover:bg-white/15 transition text-center">
          Call {PHONE}
        </a>
      </div>
      <p class="mt-4 text-white/70 text-sm">Licensed, bonded &amp; insured • CSLB #1148568</p>
    </div>
  </header>

  <!-- QUICK INTRO -->
  <section class="max-w-7xl mx-auto px-6 py-12 md:py-16 grid md:grid-cols-2 gap-10 items-center">
    <img src="/assets/mold-removal.svg" alt="Illustration of a home protected from water damage and mold" class="rounded-2xl border border-line shadow-sm w-full h-72 md:h-[420px] object-cover" width="1200" height="800">
    <div>
      <h2 class="text-2xl md:text-3xl font-extrabold mb-4">Mold is a water problem first</h2>
      <p class="text-gray-700 mb-4">
        Mold only grows where there is moisture. In the desert that water almost always comes from inside the house or through the roof: a slow leak under a sink, an AC condensate line that backs up, a shower with no exhaust fan, or a roof that leaks during a storm. Removing the mold without fixing the water only buys time.
      </p>
      <p class="text-gray-700 mb-4">
        Many mold companies remove the damage and leave you with open walls. We are a Class B general building contractor, so one team finds the source, fixes it, removes the mold and rebuilds the room.
      </p>
      <ul class="space-y-2 text-gray-700">
        <li class="flex gap-2"><span class="text-brand font-black">•</span> Inspection, moisture readings and mold testing</li>
        <li class="flex gap-2"><span class="text-brand font-black">•</span> Containment and HEPA air filtration while we work</li>
        <li class="flex gap-2"><span class="text-brand font-black">•</span> Leak, condensation and drainage repair</li>
        <li class="flex gap-2"><span class="text-brand font-black">•</span> Drywall, insulation, paint, cabinets and flooring put back</li>
      </ul>
    </div>
  </section>

  <!-- WHAT WE OFFER -->
  <section class="py-16 bg-soft" id="services-offered">
    <div class="max-w-7xl mx-auto px-6">
      <div class="text-center mb-10">
        <h2 class="text-3xl md:text-4xl font-extrabold title-accent">Our Mold Removal Process</h2>
        <p class="text-gray-600 mt-2">Every step, done by the same team.</p>
      </div>
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <article class="bg-white rounded-2xl border border-line p-6">
          <h3 class="font-bold text-lg">1. Inspection &amp; Testing</h3>
          <p class="text-gray-600 text-sm mt-2">We inspect the affected area and nearby rooms, take moisture readings to see how far the water went, and test when it helps answer a question, like whether mold is behind a wall.</p>
        </article>
        <article class="bg-white rounded-2xl border border-line p-6">
          <h3 class="font-bold text-lg">2. Finding &amp; Fixing the Source</h3>
          <p class="text-gray-600 text-sm mt-2">Plumbing leaks, roof leaks, AC condensate overflow, poor bathroom ventilation, window condensation or drainage against the house. We fix it so the mold has no reason to come back.</p>
        </article>
        <article class="bg-white rounded-2xl border border-line p-6">
          <h3 class="font-bold text-lg">3. Containment</h3>
          <p class="text-gray-600 text-sm mt-2">We seal the work area with plastic sheeting and run HEPA air filtration, so spores and dust stay out of the rest of your home while we work.</p>
        </article>
        <article class="bg-white rounded-2xl border border-line p-6">
          <h3 class="font-bold text-lg">4. Removal &amp; Cleaning</h3>
          <p class="text-gray-600 text-sm mt-2">Moldy drywall, insulation, baseboards and other porous materials are removed and bagged. Remaining surfaces are HEPA-vacuumed, cleaned and treated with an antimicrobial.</p>
        </article>
        <article class="bg-white rounded-2xl border border-line p-6">
          <h3 class="font-bold text-lg">5. Drying &amp; Verification</h3>
          <p class="text-gray-600 text-sm mt-2">We confirm the framing and materials are dry before anything is closed up. Post-removal testing is available if you want confirmation in writing.</p>
        </article>
        <article class="bg-white rounded-2xl border border-line p-6">
          <h3 class="font-bold text-lg">6. Rebuild</h3>
          <p class="text-gray-600 text-sm mt-2">New drywall, insulation, texture and paint, baseboards, cabinets or flooring. When we leave, the room is finished, not just cleaned out.</p>
        </article>
      </div>
    </div>
  </section>

  <!-- WHERE -->
  <section class="py-16 bg-white">
    <div class="max-w-7xl mx-auto px-6">
      <div class="text-center mb-10">
        <h2 class="text-3xl md:text-4xl font-extrabold title-accent">Where Mold Hides in Desert Homes</h2>
        <p class="text-gray-600 mt-2">The dry air outside doesn't stop mold inside. These are the places we check first.</p>
      </div>
      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div class="bg-soft rounded-2xl border border-line p-6">
          <i data-feather="droplet" class="w-6 h-6 text-brand"></i>
          <h3 class="font-bold mt-3">Bathrooms</h3>
          <p class="text-gray-700 text-sm mt-1">Showers without a working exhaust fan, cracked grout and failed caulk let water into the wall behind the tile. <a href="/blog/why-bathroom-ventilation-matters-more-in-the-desert/" class="text-brand font-semibold hover:underline">Why ventilation matters</a>.</p>
        </div>
        <div class="bg-soft rounded-2xl border border-line p-6">
          <i data-feather="wind" class="w-6 h-6 text-brand"></i>
          <h3 class="font-bold mt-3">AC closets &amp; attics</h3>
          <p class="text-gray-700 text-sm mt-1">AC systems make a lot of water in summer. A clogged condensate line or rusted pan soaks the closet floor, the wall or the ceiling below.</p>
        </div>
        <div class="bg-soft rounded-2xl border border-line p-6">
          <i data-feather="home" class="w-6 h-6 text-brand"></i>
          <h3 class="font-bold mt-3">Ceilings &amp; roofs</h3>
          <p class="text-gray-700 text-sm mt-1">Monsoon storms and winter rain find weak flashing and worn roofing. Water spreads across the top of the ceiling before it shows as a stain.</p>
        </div>
        <div class="bg-soft rounded-2xl border border-line p-6">
          <i data-feather="tool" class="w-6 h-6 text-brand"></i>
          <h3 class="font-bold mt-3">Under sinks &amp; behind appliances</h3>
          <p class="text-gray-700 text-sm mt-1">Slow drips from supply lines, dishwashers, washers and water heaters soak cabinets and baseboards for months before anyone notices.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- FACTS -->
  <section class="py-16 bg-soft">
    <div class="max-w-7xl mx-auto px-6">
      <div class="text-center mb-10">
        <h2 class="text-3xl md:text-4xl font-extrabold title-accent">Good to Know</h2>
      </div>
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div class="bg-white rounded-2xl border border-line p-6">
          <p class="text-brand font-black text-3xl mb-2">24–48 hrs</p>
          <p class="text-gray-700 text-sm">The EPA recommends drying water-damaged areas and items within 24 to 48 hours to prevent mold growth. After a leak, speed matters.</p>
        </div>
        <div class="bg-white rounded-2xl border border-line p-6">
          <p class="text-brand font-black text-3xl mb-2">10 sq ft</p>
          <p class="text-gray-700 text-sm">For mold covering more than about 10 square feet (roughly 3 by 3 feet), EPA guidance recommends a professional rather than doing it yourself.</p>
        </div>
        <div class="bg-white rounded-2xl border border-line p-6">
          <p class="text-brand font-black text-3xl mb-2">Fix first</p>
          <p class="text-gray-700 text-sm">Cleaning mold without fixing the moisture problem doesn't last. The water source has to be repaired, or the mold returns.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- SERVICE AREAS -->
  <section class="max-w-7xl mx-auto px-6 py-12" id="service-areas">
    <div class="bg-white border border-line rounded-2xl p-6 md:p-8 shadow-sm">
      <h2 class="text-2xl md:text-3xl font-extrabold mb-4">Mold Removal Service Areas</h2>
      <p class="text-gray-700 mb-5">We handle residential mold removal across Palm Springs, the Coachella Valley, the High Desert and the Inland Empire. Each city page covers what we see most in that area's homes.</p>
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-gray-700 font-medium">
{areas}
      </div>
      <div class="mt-6">
        <a href="#contact" class="inline-flex bg-brand text-white px-6 py-3 rounded-lg font-bold hover:opacity-95 transition">Get a Free On-Site Estimate</a>
      </div>
    </div>
  </section>

  <!-- RELATED -->
  <section class="max-w-7xl mx-auto px-6 pb-4">
    <div class="bg-soft border border-line rounded-2xl p-6">
      <p class="font-bold">Mold often comes with another repair</p>
      <p class="text-gray-700 text-sm mt-1">Fixing the cause can mean a roof repair, a plumbing fix, new insulation, a bathroom upgrade or new windows. We do all of these, so it can be one project and one quote.</p>
      <div class="mt-3 flex flex-wrap gap-4 text-sm font-bold">
        <a href="/roofing/" class="text-brand hover:underline">Roofing →</a>
        <a href="/plumbing/" class="text-brand hover:underline">Plumbing →</a>
        <a href="/insulation/" class="text-brand hover:underline">Insulation →</a>
        <a href="/bathroom-remodeling/" class="text-brand hover:underline">Bathroom remodeling →</a>
        <a href="/windows/" class="text-brand hover:underline">Windows →</a>
      </div>
    </div>
  </section>

  <!-- EXPANDED Q&A -->
  <section class="py-16 bg-white">
    <div class="max-w-4xl mx-auto px-6">
      <div class="text-center mb-10">
        <h2 class="text-3xl md:text-4xl font-extrabold title-accent">Common Questions About Mold Removal</h2>
        <p class="text-gray-600 mt-2">What homeowners ask us most, answered honestly.</p>
      </div>
      <div class="space-y-4">
{faq_html}
      </div>
    </div>
  </section>

{tail}'''


def add_mold_chip():
    """Adds a "Mold removal" option to every site booking form's project list."""
    chip = '<label class="chip relative"><input type="checkbox" name="services" value="mold"><span>Mold removal</span></label>'
    anchor = re.compile(r'(\n(\s*)<label class="chip relative"><input type="checkbox" name="services" value="cool-life-paint"><span>Cool Life Paint</span></label>)')
    n = 0
    for dirpath, _, files in os.walk(ROOT):
        if any(x in dirpath for x in (".git", "node_modules", "mold-removal", "mold-estimate")):
            continue
        for fn in files:
            if not fn.endswith(".html"):
                continue
            p = os.path.join(dirpath, fn)
            with open(p, encoding="utf-8") as f:
                s = f.read()
            if 'value="mold"' in s or not anchor.search(s):
                continue
            s = anchor.sub(lambda m: m.group(1) + "\n" + m.group(2) + chip, s, count=1)
            with open(p, "w", encoding="utf-8", newline="") as f:
                f.write(s)
            n += 1
    print("mold chip added to", n, "booking forms")


if __name__ == "__main__":
    add_mold_chip()
    write("mold-removal/index.html", main_page())
    top, foot = city_shell()
    for slug, name, nearby in CITIES:
        write(f"mold-removal/{slug}/index.html", city_page(top, foot, slug, name, nearby))
