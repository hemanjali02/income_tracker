import PublicLayout from './PublicLayout'

export default function Terms() {
  return (
    <PublicLayout>
      <article className="prose prose-invert max-w-none">
        <h1 className="text-2xl font-bold text-white mb-2">Terms of Service</h1>
        <p className="text-xs text-gray-500 mb-8">Last updated 26 June 2026</p>

        <Section title="What this app is">
          <p>Income Tracker is a tool you can use to record and review your own personal finances. It is built and maintained as a personal project. By using the app, you agree to the terms on this page.</p>
        </Section>

        <Section title="Your account">
          <p>You are responsible for keeping your password safe. We will never ask you for it. If someone else uses your credentials to access the app, anything they do counts as your activity. Use a password you do not use anywhere else.</p>
        </Section>

        <Section title="What you can do">
          <p>You can use the app for any lawful personal purpose. You can export your data, share screenshots, and run the app on as many devices as you like. You can stop using it at any time without notice.</p>
        </Section>

        <Section title="What you should not do">
          <p>Please do not try to access other people's accounts, run automated scrapers, abuse the import features to overload the service, or attempt to break the security of the platform. If you find a security issue, tell us at the contact email below and we will fix it.</p>
        </Section>

        <Section title="No financial advice">
          <p>The numbers, charts, forecasts, and insights shown in the app are derived from data you enter yourself. They are not financial advice. Before making any real money decision, please consult a qualified professional. The app may also contain bugs that affect calculations, so always verify important figures yourself.</p>
        </Section>

        <Section title="Availability">
          <p>We try to keep the app online and your data safe, but we do not offer any uptime guarantee. The service is provided as is, without warranty of any kind. We are not liable for any loss arising from use of the app or from gaps in availability.</p>
        </Section>

        <Section title="Changes to the service">
          <p>Features may be added, changed, or removed at any time. We will not delete your data without warning, but the way the app looks and behaves can evolve.</p>
        </Section>

        <Section title="Ending your account">
          <p>You can delete your account from inside the app or from the public deletion page at /delete-account at any time. We may suspend or remove accounts that abuse the service or violate these terms.</p>
        </Section>

        <Section title="Governing law">
          <p>These terms are governed by the laws of India. Any disputes will be resolved in the courts of Hyderabad.</p>
        </Section>

        <Section title="Contact">
          <p>For questions about these terms write to <a className="text-violet-300 hover:text-violet-200" href="mailto:suryamaturi19@gmail.com">suryamaturi19@gmail.com</a>.</p>
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
