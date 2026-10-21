package com.digivault.service;

import com.digivault.entity.Document;
import com.digivault.entity.User;
import com.digivault.repository.DocumentRepository;
import com.digivault.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final UserRepository userRepository;

    @Value("${file.upload-dir}")
    private String uploadDir;

    public Document upload(MultipartFile file, String email) throws IOException {
        if (file.isEmpty()) {
            throw new RuntimeException("Please select a file to upload");
        }

        User user = getUser(email);

        // Create the uploads folder if it does not exist yet
        Path uploadPath = Paths.get(uploadDir);
        Files.createDirectories(uploadPath);

        // Only keep the plain file name (no folders) and add a UUID so names never clash
        String originalName = Paths.get(file.getOriginalFilename()).getFileName().toString();
        String storedName = UUID.randomUUID() + "_" + originalName;
        Path targetPath = uploadPath.resolve(storedName);
        Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

        Document document = new Document();
        document.setFileName(originalName);
        document.setFileType(file.getContentType());
        document.setFilePath(targetPath.toString());
        document.setFileSize(file.getSize());
        document.setUploadedAt(LocalDateTime.now());
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

    public Resource download(Document document) throws MalformedURLException {
        Path path = Paths.get(document.getFilePath());
        Resource resource = new UrlResource(path.toUri());
        if (!resource.exists()) {
            throw new RuntimeException("File not found on server");
        }
        return resource;
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
