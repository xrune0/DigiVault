package com.digivault.controller;

import com.digivault.entity.Document;
import com.digivault.service.DocumentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;

    // authentication.getName() returns the logged-in user's email (set by JwtAuthFilter)

    @PostMapping("/upload")
    public ResponseEntity<?> upload(@RequestParam("file") MultipartFile file,
                                    @RequestParam(value = "category", defaultValue = "Other") String category,
                                    Authentication authentication) {
        try {
            Document document = documentService.upload(file, category, authentication.getName());
            return ResponseEntity.ok(document);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<List<Document>> list(Authentication authentication) {
        return ResponseEntity.ok(documentService.getUserDocuments(authentication.getName()));
    }

    // Also used for in-browser preview: the frontend fetches the file and shows it in a popup
    @GetMapping("/download/{id}")
    public ResponseEntity<?> download(@PathVariable Long id, Authentication authentication) {
        try {
            Document document = documentService.getDocument(id, authentication.getName());
            byte[] data = documentService.readFile(document);

            String contentType = document.getFileType() != null ? document.getFileType() : "application/octet-stream";
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + document.getFileName() + "\"")
                    .body(data);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/{id}/summarize")
    public ResponseEntity<?> summarize(@PathVariable Long id, Authentication authentication) {
        try {
            String summary = documentService.summarize(id, authentication.getName());
            return ResponseEntity.ok(Map.of("summary", summary));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, Authentication authentication) {
        try {
            documentService.delete(id, authentication.getName());
            return ResponseEntity.ok(Map.of("message", "Document deleted"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
