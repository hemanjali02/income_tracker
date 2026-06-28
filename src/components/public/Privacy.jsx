import PublicLayout from './PublicLayout'

export default function Privacy() {
  return (
    <PublicLayout>
      <article className="prose prose-invert max-w-none">
        <h1 className="text-2xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-xs text-gray-500 mb-8">Last updated 26 June 2026</p>

        <Section title="Who this policy is for">
          <p>This policy covers Income Tracker, a personal finance app you can use through your web browser or as an installed app. If you only use the app in local mode without signing in, none of your data ever leaves your device and this policy mostly does not apply to you. The sections below describe what happens when you do create an account.</p>
        </Section>

        <Section title="What we collect">
          <p>The only information we keep on our servers is what you choose to put into the app. That means:</p>
          <ul>
            <li>Your username, and optionally your email address and display name.</li>
            <li>Your password, stored only as a one way cryptographic hash, never as plain text.</li>
            <li>If you sign in with Google, the Google account identifier and basic profile fields Google sends to us during sign in.</li>
            <li>The financial entries you create yourself: transactions, accounts, balances, categories, budgets, recurring items, goals, receivables, and investments.</li>
            <li>Active session tokens so you stay signed in across visits.</li>
          </ul>
          <p>We do not collect location data. We do not run analytics or advertising trackers. We do not use cookies for tracking, only for keeping you signed in.</p>
        </Section>

        <Section title="Where your data is stored">
          <p>Account information and financial entries are stored in MongoDB Atlas, hosted in Asia. The connection between your device and our server is always encrypted with HTTPS. Passwords are hashed using PBKDF2 with one hundred thousand iterations of SHA 512, which means your raw password is never stored anywhere we can read it.</p>
        </Section>

        <Section title="Who can see your data">
          <p>Only you, signed in with your own credentials. Nobody on our side reads or analyses your transactions. We do not sell, rent, or share your data with anyone. There are no third party data processors involved in handling your financial entries.</p>
        </Section>

        <Section title="How to delete your account">
          <p>You can delete your account at any time, and we will permanently remove every record we hold about you. There are two ways to do this:</p>
          <ul>
            <li>Sign in, open the user menu in the sidebar, and choose Delete Account. You will be asked to confirm with your password.</li>
            <li>If you cannot sign in, visit the public deletion page at /delete-account and confirm with your username and password.</li>
          </ul>
          <p>Deletion is immediate and removes your user record, every transaction, account, category, budget, investment, recurring item, goal, receivable, snapshot, and active session. We do not keep backups of deleted accounts.</p>
        </Section>

        <Section title="Data export">
          <p>You can export all your transactions to a CSV file at any time using the Export button on the Transactions page. We do not lock your data in.</p>
        </Section>

        <Section title="Children">
          <p>The app is not directed at children under thirteen and we do not knowingly collect data from them. If you believe a child has created an account, contact us and we will remove it.</p>
        </Section>

        <Section title="Changes to this policy">
          <p>If we ever change how the app handles your data, we will update this page and the date at the top. Material changes will also show up as a notice inside the app the next time you sign in.</p>
        </Section>

        <Section title="Contact">
          <p>Reach out to <a className="text-violet-300 hover:text-violet-200" href="mailto:suryamaturi19@gmail.com">suryamaturi19@gmail.com</a> with any privacy questions or data requests.</p>
        </Section>
      </article>
    </PublicLayout>
  )
}

function Section({ title, children }) {
  return (
    <section className="mb-7">
      <h2 className="text-lg font-semibold text-white mb-3">{title}</h2>
      <div className="text-sm text-gray-300 leading-relaxed space-y-3">{children}</div>
    </section>
  )
}
