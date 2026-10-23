package com.digivault.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "bookmarks")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Bookmark {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, length = 2048)
    private String url;

    // Optional note about what the link leads to
    @Column(columnDefinition = "TEXT")
    private String description;

    // Broad category chosen by the user, e.g. Learning, Shopping
    private String category;

    // Detected automatically from the link, e.g. YouTube, Google, medium.com
    private String site;

    private LocalDateTime createdAt;

    // Marked as a favourite with the star button
    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean starred;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore // don't send user details (and password hash) with every bookmark
    private User user;
}
