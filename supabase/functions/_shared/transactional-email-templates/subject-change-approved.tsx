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

const SubjectChangeApprovedEmail = ({ nome, current_subject, requested_subject, admin_notes }: Props) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>O teu pedido foi aprovado ✓</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{nome ? `Boas notícias, ${nome}!` : 'Boas notícias!'}</Heading>
        <Text style={text}>
          O teu pedido de mudança de disciplina foi <strong style={{ color: '#15803d' }}>aprovado</strong>.
        </Text>
        <Section style={card}>
          <Text style={cardLine}><strong>De:</strong> {current_subject || '—'}</Text>
          <Text style={cardLine}><strong>Para:</strong> {requested_subject || '—'}</Text>
        </Section>
        {admin_notes ? (
          <>
            <Text style={text}><strong>Nota do administrador:</strong></Text>
            <Text style={quote}>{admin_notes}</Text>
          </>
        ) : null}
        <Text style={text}>
          O teu perfil já foi atualizado. Podes começar a estudar a nova disciplina imediatamente.
        </Text>
        <Text style={footer}>A equipa {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SubjectChangeApprovedEmail,
  subject: 'Pedido de mudança de disciplina aprovado ✓',
  displayName: 'Mudança de disciplina — Aprovado',
  previewData: { nome: 'João', current_subject: 'Matemática', requested_subject: 'Física' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#475569', lineHeight: '1.6', margin: '0 0 18px' }
const card = { backgroundColor: '#f0fdf4', borderRadius: '10px', padding: '16px 20px', border: '1px solid #bbf7d0', margin: '8px 0 22px' }
const cardLine = { fontSize: '14px', color: '#14532d', margin: '4px 0' }
const quote = { fontSize: '14px', color: '#475569', lineHeight: '1.6', margin: '0 0 18px', padding: '12px 16px', borderLeft: '3px solid #cbd5e1', backgroundColor: '#f8fafc', fontStyle: 'italic' as const }
const footer = { fontSize: '13px', color: '#64748b', margin: '28px 0 0' }
