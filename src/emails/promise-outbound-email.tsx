import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

type PromiseOutboundEmailProps = {
  customerName: string;
  headline: string;
  body: string;
};

function paragraphize(body: string) {
  return body
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function PromiseOutboundEmail({
  customerName,
  headline,
  body,
}: PromiseOutboundEmailProps) {
  const paragraphs = paragraphize(body);

  return (
    <Html>
      <Head />
      <Preview>{headline}</Preview>
      <Body
        style={{
          backgroundColor: "#f5f1e8",
          color: "#1e2728",
          fontFamily: "Georgia, 'Times New Roman', serif",
          margin: 0,
          padding: "24px 0",
        }}
      >
        <Container
          style={{
            backgroundColor: "#fffaf2",
            border: "1px solid #d7c3a2",
            borderRadius: "24px",
            margin: "0 auto",
            maxWidth: "560px",
            overflow: "hidden",
            padding: "32px",
          }}
        >
          <Section style={{ marginBottom: "24px" }}>
            <Text
              style={{
                color: "#8e5a2a",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.18em",
                margin: 0,
                textTransform: "uppercase",
              }}
            >
              WrenchReady
            </Text>
            <Heading
              as="h1"
              style={{
                fontSize: "28px",
                lineHeight: 1.2,
                margin: "12px 0 0",
              }}
            >
              {headline}
            </Heading>
            <Text style={{ color: "#5e6a6a", fontSize: "15px", margin: "12px 0 0" }}>
              {customerName}, this is part of keeping the visit clear from start to finish.
            </Text>
          </Section>

          {paragraphs.map((paragraph) => (
            <Text
              key={paragraph}
              style={{
                color: "#2f3a3b",
                fontSize: "15px",
                lineHeight: 1.65,
                margin: "0 0 14px",
                whiteSpace: "pre-wrap",
              }}
            >
              {paragraph}
            </Text>
          ))}
        </Container>
      </Body>
    </Html>
  );
}

export default PromiseOutboundEmail;
