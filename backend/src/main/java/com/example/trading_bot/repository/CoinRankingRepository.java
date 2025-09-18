package com.example.trading_bot.repository;

import com.example.trading_bot.model.CoinRanking;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface CoinRankingRepository extends JpaRepository<CoinRanking, Long> {

    Optional<CoinRanking> findBySymbol(String symbol);

    List<CoinRanking> findByTierOrderByRankAsc(Integer tier);

    @Query("SELECT c FROM CoinRanking c WHERE c.tier <= :tier AND c.isActive = true ORDER BY c.rank ASC")
    List<CoinRanking> findByTierLessThanEqual(@Param("tier") Integer tier);

    @Query("SELECT c FROM CoinRanking c WHERE c.quoteAsset = :quoteAsset AND c.isActive = true ORDER BY c.quoteVolume24h DESC")
    Page<CoinRanking> findByQuoteAsset(@Param("quoteAsset") String quoteAsset, Pageable pageable);

    @Query("SELECT c FROM CoinRanking c WHERE c.isActive = true ORDER BY c.quoteVolume24h DESC")
    Page<CoinRanking> findTopByVolume(Pageable pageable);

    @Query("SELECT c FROM CoinRanking c WHERE " +
            "(LOWER(c.symbol) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
            "LOWER(c.baseAsset) LIKE LOWER(CONCAT('%', :query, '%'))) " +
            "AND c.isActive = true " +
            "ORDER BY c.quoteVolume24h DESC")
    List<CoinRanking> searchCoins(@Param("query") String query, Pageable pageable);

    @Query("SELECT c FROM CoinRanking c WHERE c.lastUpdateTime < :threshold")
    List<CoinRanking> findStaleData(@Param("threshold") LocalDateTime threshold);

    @Modifying
    @Query("UPDATE CoinRanking c SET c.tier = " +
            "CASE " +
            "  WHEN c.rank <= 20 THEN 1 " +
            "  WHEN c.rank <= 100 THEN 2 " +
            "  ELSE 3 " +
            "END")
    void updateTiersByRank();

    @Query("SELECT c FROM CoinRanking c WHERE c.symbol IN :symbols AND c.isActive = true")
    List<CoinRanking> findBySymbolIn(@Param("symbols") List<String> symbols);

    @Query(value = "SELECT * FROM coin_rankings WHERE is_active = true " +
            "ORDER BY quote_volume_24h DESC " +
            "LIMIT :limit OFFSET :offset", nativeQuery = true)
    List<CoinRanking> findWithPagination(@Param("limit") int limit, @Param("offset") int offset);

    @Query("SELECT COUNT(c) FROM CoinRanking c WHERE c.isActive = true")
    long countActiveCoins();

    @Modifying
    @Query("UPDATE CoinRanking c SET c.isActive = false WHERE c.lastUpdateTime < :threshold")
    void deactivateStaleCoins(@Param("threshold") LocalDateTime threshold);
}