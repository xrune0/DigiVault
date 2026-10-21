package com.digivault.service;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@Service
public class AiService {

    // Long documents are cut to this many characters to keep the request small and cheap
    private static final int MAX_CHARS = 15000;

    @Value("${openai.api-key}")
    private String apiKey;

    @Value("${openai.model}")
    private String model;

    @Value("${openai.url}")
    private String apiUrl;

    private final RestClient restClient = RestClient.create();

    // ===== Step 1: get plain text out of the file =====
    public String extractText(byte[] data, String fileName) throws Exception {
        String name = fileName.toLowerCase();

        if (name.endsWith(".pdf")) {
            try (PDDocument pdf = Loader.loadPDF(data)) {
                return new PDFTextStripper().getText(pdf);
            }
        }
        if (name.endsWith(".docx")) {
            try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(data));
                 XWPFWordExtractor extractor = new XWPFWordExtractor(doc)) {
                return extractor.getText();
            }
        }
        if (name.endsWith(".txt") || name.endsWith(".csv") || name.endsWith(".md")) {
            return new String(data, StandardCharsets.UTF_8);
        }

        throw new RuntimeException("Summaries are supported for PDF, DOCX, TXT, CSV and MD files only");
    }

    // ===== Step 2: ask the AI for a summary =====
    @SuppressWarnings("unchecked")
    public String summarize(String text) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new RuntimeException("AI is not configured. Set the OPENAI_API_KEY environment variable.");
        }
        if (text == null || text.isBlank()) {
            throw new RuntimeException("No readable text found in this document (it may be a scanned image)");
        }
        if (text.length() > MAX_CHARS) {
            text = text.substring(0, MAX_CHARS);
        }

        Map<String, Object> body = Map.of(
                "model", model,
                "messages", List.of(
                        Map.of("role", "system", "content",
                                "You summarize documents for a personal document vault. "
                                        + "Write a short summary (3-5 sentences) followed by up to 5 bullet points "
                                        + "with the key details such as names, dates, amounts and deadlines. Use plain text."),
                        Map.of("role", "user", "content", text)
                )
        );

        try {
            Map<String, Object> response = restClient.post()
                    .uri(apiUrl)
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(Map.class);

            // Response shape: { "choices": [ { "message": { "content": "..." } } ] }
            List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
            Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
            return ((String) message.get("content")).trim();

        } catch (RestClientResponseException e) {
            int status = e.getStatusCode().value();
            if (status == 401) throw new RuntimeException("OpenAI rejected the API key. Check OPENAI_API_KEY.");
            if (status == 429) throw new RuntimeException("OpenAI rate limit or no credit left on your account.");
            throw new RuntimeException("AI request failed (HTTP " + status + ")");
        }
    }
}
