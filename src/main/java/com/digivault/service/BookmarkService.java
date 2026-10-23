package com.digivault.service;

import com.digivault.dto.BookmarkRequest;
import com.digivault.entity.Bookmark;
import com.digivault.entity.User;
import com.digivault.repository.BookmarkRepository;
import com.digivault.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class BookmarkService {

    private static final List<String> CATEGORIES = List.of(
            "Learning", "Entertainment", "Shopping", "News & Reading", "Work & Tools", "Social", "Other");

    // Well-known websites get a friendly name; any other site shows its domain instead.
    // Key = main domain name (e.g. "youtube" matches youtube.com, m.youtube.com, youtube.co.in)
    private static final Map<String, String> KNOWN_SITES = new LinkedHashMap<>();

    static {
        KNOWN_SITES.put("youtube", "YouTube");
        KNOWN_SITES.put("youtu", "YouTube"); // youtu.be short links
        KNOWN_SITES.put("google", "Google");
        KNOWN_SITES.put("github", "GitHub");
        KNOWN_SITES.put("wikipedia", "Wikipedia");
        KNOWN_SITES.put("amazon", "Amazon");
        KNOWN_SITES.put("flipkart", "Flipkart");
        KNOWN_SITES.put("myntra", "Myntra");
        KNOWN_SITES.put("instagram", "Instagram");
        KNOWN_SITES.put("facebook", "Facebook");
        KNOWN_SITES.put("linkedin", "LinkedIn");
        KNOWN_SITES.put("reddit", "Reddit");
        KNOWN_SITES.put("twitter", "X");
        KNOWN_SITES.put("x", "X");
        KNOWN_SITES.put("stackoverflow", "Stack Overflow");
        KNOWN_SITES.put("medium", "Medium");
        KNOWN_SITES.put("netflix", "Netflix");
        KNOWN_SITES.put("spotify", "Spotify");
        KNOWN_SITES.put("chatgpt", "ChatGPT");
        KNOWN_SITES.put("udemy", "Udemy");
        KNOWN_SITES.put("coursera", "Coursera");
        KNOWN_SITES.put("geeksforgeeks", "GeeksforGeeks");
    }

    private final BookmarkRepository bookmarkRepository;
    private final UserRepository userRepository;

    public List<Bookmark> getUserBookmarks(String email) {
        return bookmarkRepository.findByUserIdOrderByCreatedAtDesc(getUser(email).getId());
    }

    public Bookmark create(BookmarkRequest request, String email) {
        Bookmark bookmark = new Bookmark();
        bookmark.setUser(getUser(email));
        bookmark.setCreatedAt(LocalDateTime.now());
        applyRequest(bookmark, request);
        return bookmarkRepository.save(bookmark);
    }

    public Bookmark update(Long id, BookmarkRequest request, String email) {
        Bookmark bookmark = getOwnedBookmark(id, email);
        applyRequest(bookmark, request);
        return bookmarkRepository.save(bookmark);
    }

    public void delete(Long id, String email) {
        bookmarkRepository.delete(getOwnedBookmark(id, email));
    }

    // Flip the star (favourite) flag
    public Bookmark toggleStar(Long id, String email) {
        Bookmark bookmark = getOwnedBookmark(id, email);
        bookmark.setStarred(!bookmark.isStarred());
        return bookmarkRepository.save(bookmark);
    }

    // Copy the form values onto the bookmark after checking them
    private void applyRequest(Bookmark bookmark, BookmarkRequest request) {
        URI uri = parseUrl(request.getUrl());
        String url = uri.toString();

        bookmark.setUrl(url);
        bookmark.setSite(detectSite(uri.getHost()));
        bookmark.setTitle(isBlank(request.getTitle()) ? url : request.getTitle().trim());
        bookmark.setDescription(isBlank(request.getDescription()) ? null : request.getDescription().trim());
        // (null check first: List.of(...).contains(null) throws an error)
        String category = request.getCategory();
        bookmark.setCategory(category != null && CATEGORIES.contains(category) ? category : "Other");
    }

    // Only allow real web links. This blocks "javascript:" links that could run code when clicked.
    private URI parseUrl(String input) {
        if (isBlank(input)) {
            throw new RuntimeException("Please enter a link");
        }
        String url = input.trim();
        // Let users type "youtube.com/..." without https://
        if (!url.contains("://")) {
            url = "https://" + url;
        }

        try {
            URI uri = new URI(url);
            String scheme = uri.getScheme().toLowerCase();
            if (!(scheme.equals("http") || scheme.equals("https")) || uri.getHost() == null) {
                throw new RuntimeException();
            }
            return uri;
        } catch (Exception e) {
            throw new RuntimeException("Please enter a valid web link starting with http:// or https://");
        }
    }

    // Works out the site tag from the link address only; the server never visits the link
    private String detectSite(String host) {
        host = host.toLowerCase();
        if (host.startsWith("www.")) host = host.substring(4);
        if (host.startsWith("m.")) host = host.substring(2);

        // Check every part of the host, so docs.google.com and en.wikipedia.org are recognised too
        for (String part : host.split("\\.")) {
            if (KNOWN_SITES.containsKey(part)) {
                return KNOWN_SITES.get(part);
            }
        }
        return host;
    }

    private Bookmark getOwnedBookmark(Long id, String email) {
        Bookmark bookmark = bookmarkRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Bookmark not found"));

        // Owner check: users can only change their own bookmarks
        if (!bookmark.getUser().getEmail().equals(email)) {
            throw new RuntimeException("You do not have access to this bookmark");
        }
        return bookmark;
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
