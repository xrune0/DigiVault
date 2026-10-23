package com.digivault.controller;

import com.digivault.dto.BookmarkRequest;
import com.digivault.entity.Bookmark;
import com.digivault.service.BookmarkService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bookmarks")
@RequiredArgsConstructor
public class BookmarkController {

    private final BookmarkService bookmarkService;

    @GetMapping
    public ResponseEntity<List<Bookmark>> list(Authentication authentication) {
        return ResponseEntity.ok(bookmarkService.getUserBookmarks(authentication.getName()));
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody BookmarkRequest request, Authentication authentication) {
        try {
            return ResponseEntity.ok(bookmarkService.create(request, authentication.getName()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody BookmarkRequest request,
                                    Authentication authentication) {
        try {
            return ResponseEntity.ok(bookmarkService.update(id, request, authentication.getName()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{id}/star")
    public ResponseEntity<?> star(@PathVariable Long id, Authentication authentication) {
        try {
            return ResponseEntity.ok(bookmarkService.toggleStar(id, authentication.getName()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, Authentication authentication) {
        try {
            bookmarkService.delete(id, authentication.getName());
            return ResponseEntity.ok(Map.of("message", "Bookmark deleted"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
