import React from "react";

function Profile({ authUser }) {
  return (
    <section className="dashboard-card">
      <h1>Profil</h1>
      <p>Her er dine brugeroplysninger.</p>

      <div className="dashboard-grid">
        <article>
          <h3>Bruger</h3>
          <p>
            <strong>Navn:</strong> {authUser?.name || "Ikke angivet"}
          </p>
          <p>
            <strong>Email:</strong> {authUser?.email || "Ikke angivet"}
          </p>
          <p>
            <strong>Status:</strong> {authUser?.status || "Ukendt"}
          </p>
        </article>
      </div>
    </section>
  );
}

export default Profile;
