import React from 'react'

function SignIn() {
  return (
    <section>
      <h1>Sign In</h1>
      <form>
        <p>
          <label htmlFor='email'>Email</label>
          <br />
          <input id='email' type='email' placeholder='name@example.com' />
        </p>

        <p>
          <label htmlFor='password'>Password</label>
          <br />
          <input id='password' type='password' placeholder='Password' />
        </p>

        <button type='submit'>Sign In</button>
      </form>
    </section>
  )
}

export default SignIn
