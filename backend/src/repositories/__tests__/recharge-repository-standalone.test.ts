/**
 * Standalone test to verify RechargeRepository can be imported and used
 */
describe("RechargeRepository Standalone", () => {
  it("should be importable and instantiable", async () => {
    // Dynamic import to avoid compilation issues with other repositories
    const { RechargeRepository } = await import("../recharge-repository");

    expect(RechargeRepository).toBeDefined();
    expect(typeof RechargeRepository).toBe("function");

    const config = {
      tableName: "test-table",
      region: "us-east-1",
    };

    const repository = new RechargeRepository(config);
    expect(repository).toBeInstanceOf(RechargeRepository);
  });

  it("should have all required methods", async () => {
    const { RechargeRepository } = await import("../recharge-repository");

    const config = {
      tableName: "test-table",
      region: "us-east-1",
    };

    const repository = new RechargeRepository(config);

    // Check that all public methods exist
    expect(typeof repository.createRechargeTransaction).toBe("function");
    expect(typeof repository.getRechargeTransaction).toBe("function");
    expect(typeof repository.updateRechargeTransaction).toBe("function");
    expect(typeof repository.getUserRechargeTransactions).toBe("function");
    expect(typeof repository.getRechargeTransactionsByStatus).toBe("function");
    expect(typeof repository.getRechargeTransactionsByStatusAndDateRange).toBe(
      "function"
    );
    expect(typeof repository.batchGetRechargeTransactions).toBe("function");
    expect(typeof repository.batchCreateRechargeTransactions).toBe("function");
    expect(typeof repository.getUserDailyRechargeTotal).toBe("function");
    expect(typeof repository.cacheExchangeRate).toBe("function");
    expect(typeof repository.getCachedExchangeRate).toBe("function");
    expect(typeof repository.deleteExpiredExchangeRateCache).toBe("function");
    expect(typeof repository.getTransactionStatistics).toBe("function");
  });
});
