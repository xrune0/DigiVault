package com.digivault.service;

import com.digivault.entity.Document;
import com.digivault.entity.User;
import com.digivault.repository.DocumentRepository;
import com.digivault.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DocumentService {

    private static final List<String> CATEGORIES = List.of("ID", "Education", "Medical", "Finance", "Work", "Other");

    private final DocumentRepository documentRepository;
    private final UserRepository userRepository;
    private final EncryptionService encryptionService;
    private final AiService aiService;

    @Value("${file.upload-dir}")
    private String uploadDir;

    public Document upload(MultipartFile file, String category, String email) throws Exception {
        if (file.isEmpty()) {
            throw new RuntimeException("Please select a file to upload");
        }

        User user = getUser(email);

        // Create the uploads folder if it does not exist yet
        Path uploadPath = Paths.get(uploadDir);
        Files.createDirectories(uploadPath);

        // Only keep the plain file name (no folders) and add a UUID so names never clash
        String originalName = Paths.get(file.getOriginalFilename()).getFileName().toString();
        String storedName = UUID.randomUUID() + "_" + originalName + ".enc";
        Path targetPath = uploadPath.resolve(storedName);

        // Encrypt before writing, so the file on disk is unreadable without the key
        Files.write(targetPath, encryptionService.encrypt(file.getBytes()));

        Document document = new Document();
        document.setFileName(originalName);
        document.setFileType(file.getContentType());
        document.setFilePath(targetPath.toString());
        document.setFileSize(file.getSize());
        document.setUploadedAt(LocalDateTime.now());
        document.setCategory(CATEGORIES.contains(category) ? category : "Other");
        document.setUser(user);

        return documentRepository.save(document);
    }

    public List<Document> getUserDocuments(String email) {
        User user = getUser(email);
        return documentRepository.findByUserId(user.getId());
    }

    public Document getDocument(Long id, String email) {
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Document not found"));

        // Owner check: users can only access their own documents
        if (!document.getUser().getEmail().equals(email)) {
            throw new RuntimeException("You do not have access to this document");
        }
        return document;
    }

    // Read the encrypted file from disk and return the original bytes
    public byte[] readFile(Document document) throws Exception {
        Path path = Paths.get(document.getFilePath());
        if (!Files.exists(path)) {
            throw new RuntimeException("File not found on server");
        }
        try {
            return encryptionService.decrypt(Files.readAllBytes(path));
        } catch (Exception e) {
            throw new RuntimeException("Could not decrypt this file. Please delete it and upload it again.");
        }
    }

    public String summarize(Long id, String email) throws Exception {
        Document document = getDocument(id, email); // includes owner check

        // Already summarized? Return the saved summary instead of calling the AI again
        if (document.getSummary() != null) {
            return document.getSummary();
        }

        String text = aiService.extractText(readFile(document), document.getFileName());
        String summary = aiService.summarize(text);

        document.setSummary(summary);
        documentRepository.save(document);
        return summary;
    }

    public void delete(Long id, String email) throws IOException {
        Document document = getDocument(id, email); // includes owner check
        Files.deleteIfExists(Paths.get(document.getFilePath()));
        documentRepository.delete(document);
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}
