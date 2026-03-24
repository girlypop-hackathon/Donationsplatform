# V2-plan: Donationsplatform

Status: Arbejdsdokument (v1)
Senest opdateret: 2026-03-24
Ejere: Produkt + Tech + Legal/Compliance

## 1. Formaal
Denne plan beskriver, hvordan vi bygger Version 2 af Donationsplatform med fokus paa:
- Produktforbedringer
- Drift og skalerbarhed
- GDPR
- Skattemaessige krav
- Generel compliance

Dette dokument er et samarbejdsdokument. Vi opdaterer loebende beslutninger, antagelser og open issues.

## 2. Scope for V2
### In scope
- Stabil backend/frontend med tydelig release-proces
- Bedre datahaandtering (klassificering, opbevaring, sletning)
- Dokumenterede processer for GDPR og sikkerhed
- Afklaring af skattemaessig model for donationer
- Compliance-krav for betaling, bogfoering og revision

### Out of scope (for nu)
- Internationale skatteforhold udenfor DK/EU
- Egen betalingsinfrastruktur (hvis vi bruger tredjeparts PSP)
- Certificeringer (fx ISO 27001), medmindre det bliver et eksplicit krav

## 3. Arbejdsmetode
- Vi arbejder i 2-ugers sprint.
- Hver sprint afsluttes med:
  - Demo
  - Compliance check
  - Opdatering af dette dokument
- Alle beslutninger med juridisk/skatte-paavirkning logges under "Beslutningslog".

## 4. Spor og leverancer

## 4.1 Produkt og teknik
Maal:
- Hojere stabilitet og bedre brugeroplevelse
- Tydelig ejerskab af data og flows

Leverancer:
- Arkitektur-review af API, autentifikation og betalingsflow
- Fejlhaandtering og observability (logs, metrics, alarmer)
- Versionsstyret API-kontrakt og regressions-tests

Definition of done:
- Kritiske brugerflows har tests
- Ingen kendte high-severity sikkerhedsfejl
- Drift kan monitoreres med klare alarmer

## 4.2 GDPR-spor
Maal:
- Dokumenterbar efterlevelse af GDPR by design/by default

Arbejdsopgaver:
- Fastlaeg roller:
  - Dataansvarlig
  - Databehandler(e)
  - Underdatabehandlere
- Etabler behandlingsgrundlag per dataproces:
  - Samtykke
  - Kontrakt
  - Retlig forpligtelse
  - Legitim interesse (med afvejning)
- Data mapping:
  - Hvilke personoplysninger indsamles
  - Hvor lagres de
  - Hvem har adgang
  - Hvornaar slettes/anonymiseres de
- Udarbejd/opdater:
  - Privatlivspolitik
  - Databehandleraftaler (DPA)
  - Fortegnelse over behandlingsaktiviteter (RoPA)
  - Procedure for registreredes rettigheder (indsigt, sletning, dataportabilitet)
  - Brudhaandtering (72-timers proces)
- Vurder behov for DPIA (Data Protection Impact Assessment)

Definition of done:
- GDPR-kontrolpunkter er dokumenteret og godkendt af ansvarlig person
- Minimerings- og opbevaringspolitik er teknisk implementerbar
- Support kan haandtere registreredes anmodninger indenfor frister

## 4.3 Skat-spor (DK)
Maal:
- Klar skattemaessig model for donationer, gebyrer og eventuelle fradrag

Arbejdsopgaver (skal afklares med revisor/skatteraadgiver):
- Klassificering af transaktioner:
  - Donation
  - Servicegebyr/platformfee
  - Udbetaling til kampagneopretter/modtager
- Momssporgsmaal:
  - Er platformfee momspligtig?
  - Er donationen udenfor momsgrundlag?
- Dokumentationskrav:
  - Bilag, afstemning, revisionsspor
  - Kontoudtog vs. interne transaktionslogs
- Indberetning:
  - Hvad skal indberettes til SKAT, af hvem, og hvor ofte?
- Fradragsscenarier:
  - Hvis relevant: krav til kvittering, godkendte modtagere, beloebsgraenser

Definition of done:
- Skriftlig skattenotits valideret af ekstern fagperson
- Bogfoeringsflow matcher skattemodellen
- Kvitteringer og rapporter understotter kravene

## 4.4 Compliance-spor
Maal:
- Opfylde noedvendige regulatoriske og kontraktuelle krav

Arbejdsopgaver:
- Betaling/commercial:
  - Aftaler med PSP (betalingstjenesteudbyder)
  - Ansvarsdeling ved chargebacks/fraud
- Finansiel kontrol:
  - Bogfoeringsproces, afstemning, adgangskontrol
  - Segregation of duties hvor muligt
- Sikkerhed:
  - Adgangsstyring, least privilege, secrets management
  - Incident response runbook
  - Basis sikkerhedstest før release
- Transparens:
  - Terms & Conditions
  - Klar kommunikation om gebyrer og ansvar

Definition of done:
- Compliance checkliste er udfyldt pr. release
- Roller og ansvar er tydeligt allokeret
- Kritiske processer er dokumenteret og kan auditeres

## 4.5 Skalerbarhed og distribution (V2 i hele EU)
Maal:
- Kunne vokse fra lokal/regional drift til EU-daekkende trafik uden downtime
- Bevare sikkerhed, compliance og datakvalitet under skalering

Antagelse om V1:
- Monolitisk backend + en relationel database + frontend via Vite/SPA
- Faelles database til baade transaktioner, kampagner og brugerdata

### 4.5.1 Sandsynlige flaskehalse i V1
- Database-write path:
  - Donationer, betalingsstatus og afstemning giver mange samtidige writes
  - Tung rapportering i samme DB paavirker transaktionsperformance
- Synkrone tredjepartskald:
  - Betalingsgateway, e-mail og eventuelle webhooks kan bremse API-responstid
- API-server state/session:
  - Hvis sessioner eller jobs ligger in-memory, bliver scaling skroebelig
- Statisk indhold uden CDN:
  - Images, assets og campaign-media kan overbelaste origin-server
- Manglende ko/async-model:
  - Spikes i trafik giver timeout i stedet for kontrolleret backlog

### 4.5.2 Hvad kan skaleres horisontalt (og hvad kan ikke trivielt)
Kan skaleres horisontalt relativt enkelt:
- Frontend delivery (statisk site) via CDN
- API-instanser bag load balancer, hvis de er stateless
- Worker-processer til async jobs (mail, kvitteringer, webhooks)
- Read replicas til laesetung trafik (sogning, offentlige kampagnesider)

Kan ikke skaleres trivielt:
- Primar relationel database for konsistente writes
- Strongly consistent flows: betaling, ledger, afstemning, refund
- Distribuerede transaktioner paa tvaers af services
- Compliance-logik med hard guarantees (fx revisionsspor)

Konsekvens:
- V2 boer prioritere read/write-separation, jobkoer og tydelige data-graenser, fremfor blind opsplitning i mange services.

### 4.5.3 Microservices, event-driven, caching og CDN: hvornar giver det mening?
Microservices giver mening naar:
- Et domaene har selvstaendig release-cyklus (fx betaling, kampagner, notifikationer)
- Teamet kan eje drift, observability og on-call pr. service
- Der er tydelig domaenegraense og API-kontrakt

Microservices giver ikke mening endnu naar:
- Kompleksiteten overstiger teamets kapacitet
- Data stadig er taet koblet i samme transaktionsflow

Event-driven arkitektur giver mening naar:
- Sideeffekter kan vaere asynkrone (send kvittering, opdater analytics, anti-fraud checks)
- Der er behov for robusthed mod peaks via message broker

Event-driven skal bruges med disciplin:
- Idempotente consumers
- Dead-letter queues
- Sporbar correlation-id paa alle events

Caching-lag giver mening naar:
- Laeseintensive endpoints dominerer (kampagner, kategorier, top-lister)
- Data er egnet til kort TTL eller cache invalidation via events

CDN giver mening naesten med det samme:
- Statiske assets, billeder og kampagnemedier leveres taet paa brugeren i EU
- Reducerer latency og aflaster backend markant

### 4.5.4 Trade-offs ved distribueret V2
Fordele:
- Bedre skalerbarhed og fault isolation
- Hurtigere release af enkelte domaener
- Mere robust under trafikspidser

Ulemper:
- Hojere operationel kompleksitet (monitorering, tracing, incident response)
- Svaerere debugging paa tvaers af services
- Eventual consistency og flere failure modes
- Oeget krav til platform engineering, runbooks og kompetencer

Styringsprincip:
- Start med modulaer monolit + async events for ikke-kritiske sideeffekter
- Ekstraher microservices gradvist for de hottest hotspots

### 4.5.5 Online migration fra V1 til V2 (CI/CD og zero-downtime)
Releaseprincipper:
- Trunk-based development + korte feature branches
- CI med tests, security scan og contract tests
- CD med blue/green eller rolling deploy
- Feature flags til gradvis aktivering

Datamigration uden nedetid:
- Expand/contract migrations:
  - Først additive schema-aendringer
  - Kode skriver til gammel+ny model (dual write eller adapter)
  - Backfill i batch jobs
  - Til sidst fjern gamle felter
- Canary release paa begraenset trafik og region

Sikker rollback:
- Versionerede API-kontrakter
- Readiness/liveness probes
- Automatisk rollback ved fejlrate/SLO-brud

Observability som krav foer hver stor release:
- Logs, metrics, distributed tracing
- SLO for latency, fejlrate og betalingsflow-success

### 4.5.6 Overordnet lagdelt V2-arkitektur
Lag 1: Edge og levering
- DNS, WAF, CDN, TLS termination, rate limiting

Lag 2: Applikationsadgang
- API gateway/BFF, authN/authZ, request routing, throttling

Lag 3: Domaenelogik
- Kernedomaener:
  - Campaign service
  - Donation/Payment orchestration service
  - Notification service
  - Reporting/analytics service

Lag 4: Asynkron integration
- Message broker/event bus
- Job workers og retry/dead-letter mekanismer

Lag 5: Data og persistence
- Primar transaktionsdatabase
- Read replicas/search-index til laese-scenarier
- Object storage til mediefiler
- Audit log/ledger storage (uforanderligt revisionsspor)

Lag 6: Platform og drift
- CI/CD pipelines
- IaC
- Secret management
- Monitorering, alerting, incident runbooks

Definition of done for skalerbarheds-spor:
- Dokumenteret migration path V1 -> V2 uden planlagt downtime
- Belastningstest viser kapacitet for definerede EU-scenarier
- SLO/SLA er aftalt og monitoreret
- Incident- og rollback-procedurer er testet i oefelse

## 4.6 Pædagogisk forklaring (studenter-version)
Formaal:
- Gøre det tydeligt, hvad I konkret skal gøre fra V1 til V2, i simpel form.

Kort forklaring:
- V1 fungerer fint i lille skala, men naar mange brugere kommer samtidig (hele EU), bliver nogle dele presset.
- Derfor skalerer man i lag: først de lette gevinster (CDN, cache, flere API-instanser), derefter mere avancerede greb (events, service-opdeling).
- Maalet er ikke at bygge alt nyt paa en gang, men at fjerne de stoerste flaskehalse trin for trin.

### 4.6.1 Hvad er en flaskehals? (simpelt)
En flaskehals er den del, der bliver langsom foerst og holder resten tilbage.

Typiske flaskehalse hos jer:
- Databasen ved mange samtidige donationer
- API-kald til eksterne systemer (betaling, e-mail)
- Billeder/medier uden CDN

Tommelfingerregel:
- Hvis CPU, DB-forbindelser eller svartid topper i spikes, er det tegn paa flaskehals.

### 4.6.2 Hvad skalerer nemt, og hvad er svaert?
Skalerer nemt (horisontalt):
- Flere identiske API-servere bag load balancer
- Flere worker-processer til baggrundsjob
- Frontend-assets via CDN

Svaert at skalere trivielt:
- Den primære database med konsistente writes
- Betalingsflow, afstemning og revisionsspor (skal vaere korrekte)

Hvorfor svaert?
- Fordi data skal vaere 100% korrekt, ikke bare hurtig.

### 4.6.3 Hvornar giver teknologierne mening?
CDN:
- Bruges tidligt. Hurtig effekt, lav risiko.

Caching:
- Bruges paa laesedata, fx kampagnesider.
- Undgaa cache paa kritiske betalingsdata uden klar strategi.

Event-driven:
- Bruges naar noget ikke skal ske synkront med det samme, fx e-mailkvittering.
- Giver robusthed ved trafikspidser.

Microservices:
- Bruges senere, naar I kender jeres hotspots.
- Start ikke her, hvis teamet er lille og domaener stadig er taet koblet.

### 4.6.4 Hvad er trade-offs?
I faar:
- Bedre skalerbarhed
- Mere robusthed

I betaler med:
- Mere kompleks drift
- Svaerere fejlfinding
- Flere ting at monitorere

Praktisk pointe:
- Distribueret arkitektur er ikke gratis. Gaa kun videre, hvis gevinsten er stoerre end driftsomkostningen.

### 4.6.5 Hvordan holder I systemet online under overgangen?
Enkel strategi:
1. Lav sma, bagudkompatible ændringer.
2. Deploy ofte med feature flags.
3. Rul gradvist ud (canary/blue-green).
4. Overvag fejlrate og latency.
5. Rul tilbage automatisk ved problemer.

Databasen under migration:
- Udvid schema foerst
- Flyt data i baggrunden
- Fjern gammelt schema til sidst

Det er saadan I undgaar planlagt nedetid.

### 4.6.6 V2-arkitektur forklaret i 6 lag
1. Edge-lag: CDN, WAF, TLS, rate limits
2. Adgangslag: API gateway + auth
3. Forretningslag: kampagner, donationer, notifikationer, rapportering
4. Event-lag: koer og event bus til async arbejde
5. Datalag: transaktions-DB, read-modeller, object storage, audit logs
6. Driftslag: CI/CD, monitorering, secrets, incident runbooks

Huskeregel:
- "Hurtig levering i kanten, korrekt data i kernen, robust drift omkring det hele."

### 4.6.7 Konkrete naeste skridt for jer (student edition)
1. Maal V1 nu: svartid, fejlrate, DB-load, throughput.
2. Indfoer CDN + cache paa offentlige laesesider.
3. Gør API stateless og skaler med flere instanser.
4. Flyt ikke-kritiske sideeffekter til ko/worker.
5. Lav CI/CD med canary eller blue-green + rollback.
6. Evaluer om microservices stadig er noedvendigt efter disse gevinster.

## 4.7 Trin-for-trin plan fra V1 -> V2 (operationel version)
Formaal:
- Gaa fra V1 til V2 uden unodig kompleksitet, med fokus paa maelbare gevinster i hver fase.

Princip:
- Stabiliser foerst, isoler async arbejde, forbedr dataarkitektur, modulariser internt, ekstraher kun hotspots til microservices.

### Trin 1: Stabilisering (lavthaengende frugter)
Maal:
- Hurtigere svartider, mere stabil drift, mindre release-risiko.

Leverancer:
- CDN for statiske assets (fx Azure Blob + CDN) og opdatering af frontend asset-URLs.
- Stateless API (fjern in-memory session state; brug JWT eller delt session storage).
- Central logging + monitorering (request logs, error logs, latency, fejlrate).
- CI/CD pipeline med automatisk test/build/deploy paa PR/merge.

Acceptkriterier:
- Paaviselig forbedring i page load og API latency foer/efter CDN.
- Login/session virker pa tvaers af mindst 2 API-instanser bag load balancer.
- Dashboards viser donationer/minut, API response time og fejlrate.
- PR-flow afviser merges ved fejlende tests/lint.

### Trin 2: Adskil kritisk og ikke-kritisk arbejde (async)
Maal:
- Reducer synkron belastning i API og oeg robusthed under spikes.

Leverancer:
- Kortlaeg sideeffekter (email, kvittering, statistik-opdatering).
- Introducer queue (RabbitMQ eller Azure Queue) og event som DonationCompleted.
- Byg worker service med retry, dead-letter queue og idempotens-guards.

Acceptkriterier:
- Donation endpoint svarer uden at vente pa email/kvittering.
- Fejlende jobs retries automatisk og flyttes til dead-letter efter max forsog.
- Dobbelt afvikling af samme event skaber ikke dobbelt-email/dobbeltkvittering.

### Trin 3: Forbedr dataarkitektur
Maal:
- Sikre korrekthed i transaktioner og skalering af laesetung trafik.

Leverancer:
- Primar DB reserveres til transaktionelle writes (donationer/betalinger).
- Read replicas eller separat read-model til laesetunge flows (kampagner/sogning).
- Object storage til billeder/medier.
- Audit log/ledger som uforanderligt revisionsspor for transaktioner.

Acceptkriterier:
- Read-traffic er flyttet fra primar DB paa udvalgte endpoints.
- Alle donation-statusskift er sporbare med timestamp og actor/system-kilde.
- Revisionsspor kan rekonstruere donation lifecycle (oprettet -> gennemfoert -> refunderet).

### Trin 4: Modulaer monolit (foer distribuering)
Maal:
- Tydelige domaenegraenser uden fuld distribueret kompleksitet.

Leverancer:
- Domaeneopdeling: Campaign, Donation/Payment, Notification, Reporting.
- Klare interfaces mellem domaener (ingen direkte kryds-manipulation).
- Ejeransvar per domaene (teknisk owner + backup).

Acceptkriterier:
- Krydsdomaene kald gaar via definerede interfaces/events.
- Nye features implementeres indenfor eget domaene uden at bryde lagdeling.
- Team-ansvar og review-ejerskab er dokumenteret.

### Trin 5: Gradvis overgang til microservices (kun ved konkrete hotspots)
Maal:
- Ekstraher kun de dele hvor gevinsten er stoerre end driftsomkostningen.

Leverancer:
- Identificer hotspot via maalinger (fx Payment).
- Ekstraher til separat service med versioneret API-kontrakt.
- Etabler service-specifik observability (logs, metrics, tracing, SLO).

Acceptkriterier:
- Ekstraheret service kan deployes og skaleres uafhaengigt.
- Fejl i service er isoleret og paavirker ikke hele platformen ukontrolleret.
- API-kontrakt og kompatibilitet er testet automatisk.

### Tvaergaaende spor: GDPR, skat, compliance og drift
GDPR i praksis:
- Data mapping: hvilke data, hvorfor, hvor lagres de, retention og slettefrister.
- Understot registreredes rettigheder: indsigt, eksport, sletning inden 30 dage.
- Krypter foelsomme data og haandhaev adgang med least privilege.

Skat og bogfoering:
- Implementer ledger med: tidspunkt, beloeb, donor, kampagne, status, reference-id.
- Auto-generer kvitteringer med noedvendige oplysninger.
- Forbered indberetningsgrundlag (fx CPR/CVR-felter hvor relevant), valideret med revisor.

Compliance og drift:
- Brug PSP (fx Stripe) og gem kun noedvendige betalingsdata.
- Etabler daglig afstemning mellem PSP, bank og intern ledger.
- Definer chargeback-proces, adgangsstyring og audit af privilegerede handlinger.

### Migration uden downtime (expand -> migrate -> contract)
Deploy-principper:
1. Feature flags til gradvis aktivering.
2. Canary eller blue/green med live monitorering.
3. Automatisk rollback ved SLO-broed.

Database-principper:
1. Expand: tilfoej nye tabeller/felter bagudkompatibelt.
2. Migrate: backfill + dual-write/adapter i overgangsperiode.
3. Contract: fjern gammel struktur, naar laes/skriv er flyttet og valideret.

### V2 arkitektur (samlet huskeregel)
- Hurtig levering i kanten (CDN/edge), korrekt data i kernen (transaktion/ledger), robust drift omkring det hele (CI/CD/monitorering/incident response).

### KPI-forslag pr. fase
- Stabilitet: p95 latency, 5xx-rate, deployfrekvens, MTTR.
- Async robusthed: queue depth, retry-rate, dead-letter-rate, job latency.
- Datakvalitet/compliance: afstemningsafvigelser, audit completeness, DSR-SLA-overholdelse.
- Skalering: requests/sec pr. instans, DB CPU ved peak, cache hit rate.

## 5. Faseplan (foerste udkast)
## Fase 0: Afklaring (1-2 uger)
- Scope laases
- Juridiske/sporgsmaal samles
- Eksterne raadgivere identificeres

## Fase 1: Fundament (2-4 uger)
- Data mapping
- Arkitektur- og sikkerhedsgennemgang
- Udkast til GDPR- og skattedokumentation

## Fase 2: Implementering og hardening (3-6 uger)
- Prioriterede forbedringer i platformen
- Proces for DSR, retention, incident response
- Bogfoerings- og rapporteringsflow pa plads

## Fase 3: Go-live readiness (1-2 uger)
- Endelig compliance review
- End-to-end test af donation -> afstemning -> rapportering
- Release-beslutning

## 6. Beslutningslog
| Dato | Emne | Beslutning | Ejer | Næste step |
|---|---|---|---|---|
| 2026-03-24 | V2-plan opstart | Arbejdsdokument oprettet | Team | Udfyld open issues |

## 7. Open issues (skal afklares)
- Hvem er juridisk dataansvarlig i den konkrete organisationsmodel?
- Hvilke datakategorier er strengt noedvendige i V2?
- Hvilken skattemaessig behandling gaelder for platformens gebyrer?
- Skal donationskvitteringer understotte fradrag, og under hvilke betingelser?
- Hvilke compliance-krav stiller betalingspartneren kontraktuelt?

## 8. Risiko-register
| Risiko | Sandsynlighed | Konsekvens | Mitigering | Ejer |
|---|---|---|---|---|
| Uklar rollefordeling (GDPR) | Mellem | Hoj | Fastlaeg dataansvar/databehandler skriftligt | Legal |
| Forkert skattemaessig model | Mellem | Hoj | Valider med revisor tidligt | Finance |
| Mangelfuld revisionssporbarhed | Lav-Mellem | Hoj | Design transaktionslog og afstemning tidligt | Tech |
| For sen compliance involvering | Mellem | Mellem-Hoj | Compliance gate i hver sprint | PM |

## 9. Samarbejdssektion (arbejdsfelt)
Brug denne sektion til vores loebende arbejde.

### 9.1 Prioriterede sporgsmaal til naeste mode
1. [ ]
2. [ ]
3. [ ]

### 9.2 Afklaringer fra juridisk/skat
- 

### 9.3 Tekniske beslutninger der paavirker compliance
- 

---

Note: Dette dokument er et operationelt planudkast og erstatter ikke juridisk eller skattemaessig raadgivning fra kvalificerede fagpersoner.
