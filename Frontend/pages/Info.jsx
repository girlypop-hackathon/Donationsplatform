import React from "react";

function Info() {
  return (
    <section className="info-page">
      <h1>Info</h1>
      <p>
        FundTogether er en donationsplatform, hvor man kan finde, oprette og
        støtte kampagner til gode formål.
      </p>

      <article id="persondata" className="info-card">
        <h2>Persondatapolitik</h2>
        <p>
          Denne side beskriver, hvordan vi behandler personoplysninger i
          overensstemmelse med GDPR og dansk databeskyttelseslovgivning.
        </p>

        <h3>Dataansvarlig</h3>
        <p>
          FundTogether er dataansvarlig for behandling af personoplysninger, der
          indsamles via platformen.
        </p>

        <h3>Hvilke oplysninger vi behandler</h3>
        <ul>
          <li>Navn, e-mail og kontooplysninger ved donation og kampagneoprettelse.</li>
          <li>Oplysninger om donationer, beløb og tidspunkt.</li>
          <li>Eventuelle samtykkeoplysninger, fx nyhedsbrev og skattefradrag.</li>
          <li>Tekniske oplysninger, fx logdata til drift og sikkerhed.</li>
        </ul>

        <h3>Formål og behandlingsgrundlag</h3>
        <ul>
          <li>Gennemførelse af donationer og kampagnedrift (GDPR art. 6, stk. 1, litra b).</li>
          <li>Overholdelse af retlige forpligtelser, fx bogføring (art. 6, stk. 1, litra c).</li>
          <li>Samtykkebaseret kommunikation, fx nyhedsbrev (art. 6, stk. 1, litra a).</li>
          <li>Sikkerhed, fejlfinding og misbrugsforebyggelse (art. 6, stk. 1, litra f).</li>
        </ul>

        <h3>Opbevaring og sletning</h3>
        <p>
          Vi opbevarer oplysninger så længe, det er nødvendigt for formålet
          og for at opfylde lovkrav. Oplysninger slettes eller anonymiseres,
          når de ikke længere er nødvendige.
        </p>

        <h3>Deling af oplysninger</h3>
        <p>
          Oplysninger deles kun med relevante databehandlere og
          samarbejdspartnere, som er nødvendige for at levere platformens
          funktioner (fx hosting og e-mailtjenester). Vi indgår
          databehandleraftaler, hvor det er påkrævet.
        </p>

        <h3>Dine rettigheder</h3>
        <ul>
          <li>Ret til indsigt i de oplysninger vi behandler om dig.</li>
          <li>Ret til berigtigelse af urigtige oplysninger.</li>
          <li>Ret til sletning, når betingelserne er opfyldt.</li>
          <li>Ret til begrænsning af behandling i særlige situationer.</li>
          <li>Ret til dataportabilitet, hvor reglerne giver adgang.</li>
          <li>Ret til indsigelse mod behandling baseret på legitime interesser.</li>
        </ul>

        <p>
          Du kan klage til Datatilsynet, hvis du mener, at behandlingen ikke
          overholder reglerne.
        </p>
      </article>

      <article id="samtykke" className="info-card">
        <h2>Information om samtykke</h2>
        <p>
          Når vi beder om samtykke, er det frivilligt, specifikt og informeret.
          Du kan til enhver tid trække samtykke tilbage med virkning for
          fremtidig behandling.
        </p>
        <ul>
          <li>Samtykke til nyhedsbrev kan til enhver tid afmeldes.</li>
          <li>Samtykke vedr. skattefradrag bruges kun til det relevante formål.</li>
          <li>Tilbagetrækning påvirker ikke lovlig behandling foretaget før tilbagetrækning.</li>
        </ul>
      </article>
    </section>
  );
}

export default Info;
