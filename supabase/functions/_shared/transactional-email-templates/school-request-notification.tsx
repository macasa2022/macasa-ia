import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Logic Pathways'
const NOTIFY_TO = 'geral@logicpathways.online'

interface SchoolRequestNotificationProps {
  nome?: string
  email?: string
  escola?: string
  telefone?: string
  mensagem?: string
  submittedAt?: string
}

const SchoolRequestNotificationEmail = ({
  nome,
  email,
  escola,
  telefone,
  mensagem,
  submittedAt,
}: SchoolRequestNotificationProps) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>Novo pedido do Plano Escola — {escola ?? 'Escola'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Novo pedido — Plano Escola</Heading>
        <Text style={lead}>
          Foi submetido um novo pedido de contacto através do formulário do Plano Escola no site {SITE_NAME}.
        </Text>

        <Section style={card}>
          <Text style={label}>Escola</Text>
          <Text style={value}>{escola ?? '—'}</Text>

          <Hr style={divider} />

          <Text style={label}>Contacto</Text>
          <Text style={value}>{nome ?? '—'}</Text>

          <Text style={label}>Email</Text>
          <Text style={value}>{email ?? '—'}</Text>

          <Text style={label}>Telefone</Text>
          <Text style={value}>{telefone && telefone.length > 0 ? telefone : '—'}</Text>

          {mensagem && mensagem.length > 0 ? (
            <>
              <Hr style={divider} />
              <Text style={label}>Mensagem</Text>
              <Text style={messageBlock}>{mensagem}</Text>
            </>
          ) : null}
        </Section>

        <Text style={footer}>
          Recebido em {submittedAt ?? new Date().toLocaleString('pt-PT')}.
          Para responder, abre o painel de administração e atualiza o estado do pedido.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SchoolRequestNotificationEmail,
  subject: (data: Record<string, any>) =>
    `Novo pedido — Plano Escola${data?.escola ? ` (${data.escola})` : ''}`,
  to: NOTIFY_TO,
  displayName: 'Notificação interna — Plano Escola',
  previewData: {
    nome: 'Maria Silva',
    email: 'maria@escola-exemplo.pt',
    escola: 'Escola Secundária Exemplo',
    telefone: '912345678',
    mensagem: 'Gostaríamos de saber mais sobre o plano para 200 alunos.',
    submittedAt: new Date().toLocaleString('pt-PT'),
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 12px' }
const lead = { fontSize: '14px', color: '#475569', lineHeight: '1.5', margin: '0 0 20px' }
const card = { backgroundColor: '#f8fafc', borderRadius: '10px', padding: '20px', border: '1px solid #e2e8f0' }
const label = { fontSize: '11px', color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.5px', margin: '0 0 4px' }
const value = { fontSize: '14px', color: '#0f172a', margin: '0 0 14px', fontWeight: 500 }
const messageBlock = { fontSize: '14px', color: '#0f172a', margin: '0 0 4px', whiteSpace: 'pre-wrap' as const, lineHeight: '1.5' }
const divider = { borderTop: '1px solid #e2e8f0', margin: '14px 0' }
const footer = { fontSize: '12px', color: '#94a3b8', margin: '24px 0 0', lineHeight: '1.5' }
