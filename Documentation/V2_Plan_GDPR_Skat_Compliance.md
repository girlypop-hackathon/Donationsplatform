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
