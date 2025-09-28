/**
 * Test to verify RechargeRepository can be imported correctly
 */
import { RechargeRepository } from "../recharge-repository";
import { RechargeRepository as IndexedRepository } from "../index";

describe("RechargeRepository Import", () => {
  it("should be importable directly from recharge-repository", () => {
    expect(RechargeRepository).toBeDefined();
    expect(typeof RechargeRepository).toBe("function");
  });

  it("should be importable from repositories index", () => {
    expect(IndexedRepository).toBeDefined();
    expect(typeof IndexedRepository).toBe("function");
  });

  it("should be the same class when imported from different paths", () => {
    expect(RechargeRepository).toBe(IndexedRepository);
  });

  it("should be instantiable with correct config", () => {
    const config = {
      tableName: "test-table",
      region: "us-east-1",
    };

    expect(() => new RechargeRepository(config)).not.toThrow();

    const repository = new RechargeRepository(config);
    expect(repository).toBeInstanceOf(RechargeRepository);
  });
});
