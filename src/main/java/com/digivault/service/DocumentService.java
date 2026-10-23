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
import java.util.Map;
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

    @Value("${storage.quota-mb:100}")
    private long quotaMb;

    public Document upload(MultipartFile file, String category, String email) throws Exception {
        if (file.isEmpty()) {
            throw new RuntimeException("Please select a file to upload");
        }

        User user = getUser(email);

        // Storage limit check (files in Trash still count, because they are still on disk)
        long used = documentRepository.sumFileSizeByUserId(user.getId());
        if (used + file.getSize() > quotaBytes()) {
            throw new RuntimeException("Storage full: you can store up to " + quotaMb + " MB. Empty your Trash or delete files.");
        }

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

    // Active documents only (not in Trash)
    public List<Document> getUserDocuments(String email) {
        User user = getUser(email);
        return documentRepository.findByUserIdAndDeletedAtIsNull(user.getId());
    }

    public List<Document> getTrash(String email) {
        User user = getUser(email);
        return documentRepository.findByUserIdAndDeletedAtIsNotNull(user.getId());
    }

    // Storage used and the user's limit, in bytes
    public Map<String, Long> getStorage(String email) {
        User user = getUser(email);
        return Map.of("used", documentRepository.sumFileSizeByUserId(user.getId()), "quota", quotaBytes());
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

    // Flip the star (favourite) flag
    public Document toggleStar(Long id, String email) {
        Document document = getDocument(id, email);
        document.setStarred(!document.isStarred());
        return documentRepository.save(document);
    }

    // Soft delete: the file stays on disk until it is deleted from Trash
    public void moveToTrash(Long id, String email) {
        Document document = getDocument(id, email);
        document.setDeletedAt(LocalDateTime.now());
        documentRepository.save(document);
    }

    public void restore(Long id, String email) {
        Document document = getDocument(id, email);
        document.setDeletedAt(null);
        documentRepository.save(document);
    }

    // Permanent delete: removes the encrypted file and the database record
    public void deletePermanently(Long id, String email) throws IOException {
        Document document = getDocument(id, email);
        Files.deleteIfExists(Paths.get(document.getFilePath()));
        documentRepository.delete(document);
    }

    public void emptyTrash(String email) throws IOException {
        for (Document document : getTrash(email)) {
            Files.deleteIfExists(Paths.get(document.getFilePath()));
            documentRepository.delete(document);
        }
    }

    private long quotaBytes() {
        return quotaMb * 1024 * 1024;
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}
