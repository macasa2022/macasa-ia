import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Logic Pathways'

interface SchoolRequestConfirmationProps {
  nome?: string
  escola?: string
}

const SchoolRequestConfirmationEmail = ({
  nome,
  escola,
}: SchoolRequestConfirmationProps) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>Recebemos o teu pedido — {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {nome ? `Olá, ${nome}!` : 'Olá!'}
        </Heading>
        <Text style={text}>
          Obrigado pelo teu interesse no <strong>{SITE_NAME}</strong>.
          Recebemos o pedido{escola ? ` da escola ${escola}` : ''} sobre o nosso Plano Escola.
        </Text>

        <Section style={card}>
          <Text style={cardTitle}>O que se segue?</Text>
          <Text style={cardText}>
            A nossa equipa irá analisar o pedido e entrar em contacto nas próximas
            <strong> 48 horas úteis</strong> para perceber as necessidades da tua escola e
            apresentar uma proposta personalizada.
          </Text>
        </Section>

        <Text style={text}>
          Enquanto isso, podes explorar o {SITE_NAME} em{' '}
          <a href="https://logicpathways.online" style={link}>logicpathways.online</a>.
        </Text>

        <Text style={footer}>
          Com os melhores cumprimentos,<br />
          A equipa {SITE_NAME}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SchoolRequestConfirmationEmail,
  subject: 'Recebemos o teu pedido — Logic Pathways',
  displayName: 'Confirmação — Plano Escola',
  previewData: {
    nome: 'Maria',
    escola: 'Escola Secundária Exemplo',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#475569', lineHeight: '1.6', margin: '0 0 18px' }
const card = { backgroundColor: '#eff6ff', borderRadius: '10px', padding: '18px 20px', border: '1px solid #dbeafe', margin: '8px 0 22px' }
const cardTitle = { fontSize: '13px', fontWeight: 'bold' as const, color: '#1e40af', margin: '0 0 6px' }
const cardText = { fontSize: '14px', color: '#1e3a8a', lineHeight: '1.6', margin: 0 }
const link = { color: '#2563eb', textDecoration: 'underline' }
const footer = { fontSize: '13px', color: '#64748b', margin: '28px 0 0', lineHeight: '1.6' }
