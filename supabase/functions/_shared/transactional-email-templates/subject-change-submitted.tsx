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
}

const SubjectChangeSubmittedEmail = ({ nome, current_subject, requested_subject }: Props) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>Recebemos o teu pedido de mudança de disciplina</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{nome ? `Olá, ${nome}!` : 'Olá!'}</Heading>
        <Text style={text}>
          Recebemos o teu pedido de mudança de disciplina no <strong>{SITE_NAME}</strong>.
        </Text>
        <Section style={card}>
          <Text style={cardLine}><strong>Disciplina atual:</strong> {current_subject || '—'}</Text>
          <Text style={cardLine}><strong>Disciplina pedida:</strong> {requested_subject || '—'}</Text>
        </Section>
        <Text style={text}>
          A nossa equipa vai analisar o teu pedido em breve. Receberás uma nova mensagem
          assim que houver uma decisão.
        </Text>
        <Text style={footer}>A equipa {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SubjectChangeSubmittedEmail,
  subject: 'Recebemos o teu pedido de mudança de disciplina',
  displayName: 'Mudança de disciplina — Submetido',
  previewData: { nome: 'João', current_subject: 'Matemática', requested_subject: 'Física' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#475569', lineHeight: '1.6', margin: '0 0 18px' }
const card = { backgroundColor: '#f1f5f9', borderRadius: '10px', padding: '16px 20px', border: '1px solid #e2e8f0', margin: '8px 0 22px' }
const cardLine = { fontSize: '14px', color: '#0f172a', margin: '4px 0' }
const footer = { fontSize: '13px', color: '#64748b', margin: '28px 0 0' }
