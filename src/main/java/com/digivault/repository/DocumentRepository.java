package com.digivault.repository;

import com.digivault.entity.Document;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface DocumentRepository extends JpaRepository<Document, Long> {

    // Active documents (not in Trash)
    List<Document> findByUserIdAndDeletedAtIsNull(Long userId);

    // Documents in Trash
    List<Document> findByUserIdAndDeletedAtIsNotNull(Long userId);

    // Total bytes used by a user (Trash included, because those files are still on disk)
    @Query("SELECT COALESCE(SUM(d.fileSize), 0) FROM Document d WHERE d.user.id = :userId")
    long sumFileSizeByUserId(@Param("userId") Long userId);
}
