import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Logic Pathways'

interface Props {
  nome?: string
  current_subject?: string
  requested_subject?: string
  admin_notes?: string
}

const SubjectChangeRejectedEmail = ({ nome, current_subject, requested_subject, admin_notes }: Props) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>Atualização sobre o teu pedido de mudança de disciplina</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{nome ? `Olá, ${nome}` : 'Olá'}</Heading>
        <Text style={text}>
          Analisámos o teu pedido de mudança de disciplina (de <strong>{current_subject || '—'}</strong> para{' '}
          <strong>{requested_subject || '—'}</strong>) e, neste momento,
          não foi possível aprová-lo.
        </Text>
        {admin_notes ? (
          <>
            <Text style={text}><strong>Motivo:</strong></Text>
            <Text style={quote}>{admin_notes}</Text>
          </>
        ) : null}
        <Section style={card}>
          <Text style={cardText}>
            Continuas com acesso à tua disciplina atual: <strong>{current_subject || '—'}</strong>.
            Poderás submeter um novo pedido daqui a 30 dias.
          </Text>
        </Section>
        <Text style={footer}>A equipa {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SubjectChangeRejectedEmail,
  subject: 'Atualização sobre o teu pedido de mudança de disciplina',
  displayName: 'Mudança de disciplina — Rejeitado',
  previewData: { nome: 'João', current_subject: 'Matemática', requested_subject: 'Física', admin_notes: 'Pedido fora do período letivo.' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#475569', lineHeight: '1.6', margin: '0 0 18px' }
const card = { backgroundColor: '#fef3c7', borderRadius: '10px', padding: '16px 20px', border: '1px solid #fde68a', margin: '8px 0 22px' }
const cardText = { fontSize: '14px', color: '#78350f', lineHeight: '1.6', margin: 0 }
const quote = { fontSize: '14px', color: '#475569', lineHeight: '1.6', margin: '0 0 18px', padding: '12px 16px', borderLeft: '3px solid #cbd5e1', backgroundColor: '#f8fafc', fontStyle: 'italic' as const }
const footer = { fontSize: '13px', color: '#64748b', margin: '28px 0 0' }
