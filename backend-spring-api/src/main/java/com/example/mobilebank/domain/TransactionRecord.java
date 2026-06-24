package com.example.mobilebank.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "transaction_records", indexes = {
        @Index(name = "idx_tx_user", columnList = "user_id"),
        @Index(name = "idx_tx_created", columnList = "createdAt")
})
public class TransactionRecord {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TransactionType type;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    @Column(length = 30)
    private String fromAccountNumber;

    @Column(length = 30)
    private String toAccountNumber;

    @Column(length = 120)
    private String memo;

    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    protected TransactionRecord() {}

    public TransactionRecord(User user, TransactionType type, BigDecimal amount, String fromAccountNumber, String toAccountNumber, String memo) {
        this.user = user;
        this.type = type;
        this.amount = amount;
        this.fromAccountNumber = fromAccountNumber;
        this.toAccountNumber = toAccountNumber;
        this.memo = memo;
        this.expiryDate = null;
        this.createdAt = LocalDateTime.now();
    }

    public TransactionRecord(User user, TransactionType type, BigDecimal amount, String fromAccountNumber, String toAccountNumber, String memo, LocalDate expiryDate) {
        this.user = user;
        this.type = type;
        this.amount = amount;
        this.fromAccountNumber = fromAccountNumber;
        this.toAccountNumber = toAccountNumber;
        this.memo = memo;
        this.expiryDate = expiryDate;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public User getUser() { return user; }
    public TransactionType getType() { return type; }
    public BigDecimal getAmount() { return amount; }
    public String getFromAccountNumber() { return fromAccountNumber; }
    public String getToAccountNumber() { return toAccountNumber; }
    public String getMemo() { return memo; }
    public LocalDate getExpiryDate() { return expiryDate; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
