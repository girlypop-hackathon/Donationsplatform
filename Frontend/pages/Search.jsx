import React from "react";

function Search() {
  return (
    <section>
      <h1>Search Campaigns</h1>
      <p>Type a keyword to find campaigns.</p>
      <form>
        <input type="text" placeholder="Search campaigns" />
        <button type="submit">Search</button>
      </form>
    </section>
  );
}

export default Search;
