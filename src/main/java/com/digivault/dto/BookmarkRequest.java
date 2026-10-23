package com.digivault.dto;

import lombok.Data;

@Data
public class BookmarkRequest {
    private String title;
    private String url;
    private String description;
    private String category;
}
