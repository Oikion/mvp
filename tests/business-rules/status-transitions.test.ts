import { describe, it, expect } from "vitest";
import {
  // Client transitions
  isValidClientTransition,
  getClientTransitionError,
  getValidClientNextStatuses,
  CLIENT_STATUS_TRANSITIONS,
  // Property transitions
  isValidPropertyTransition,
  PROPERTY_STATUS_TRANSITIONS,
  // Deal transitions
  isValidDealTransition,
  getValidDealNextStatuses,
  DEAL_STATUS_TRANSITIONS,
  // Generic
  validateStatusTransition,
} from "@/lib/validations/status-transitions";

describe("Status Transition Rules", () => {
  describe("CRM-005: Client Status Transitions", () => {
    describe("LEAD transitions", () => {
      it("should allow LEAD -> ACTIVE", () => {
        expect(isValidClientTransition("LEAD", "ACTIVE")).toBe(true);
      });

      it("should allow LEAD -> LOST", () => {
        expect(isValidClientTransition("LEAD", "LOST")).toBe(true);
      });

      it("should not allow LEAD -> CONVERTED", () => {
        expect(isValidClientTransition("LEAD", "CONVERTED")).toBe(false);
      });

      it("should not allow LEAD -> INACTIVE", () => {
        expect(isValidClientTransition("LEAD", "INACTIVE")).toBe(false);
      });
    });

    describe("ACTIVE transitions", () => {
      it("should allow ACTIVE -> INACTIVE", () => {
        expect(isValidClientTransition("ACTIVE", "INACTIVE")).toBe(true);
      });

      it("should allow ACTIVE -> CONVERTED", () => {
        expect(isValidClientTransition("ACTIVE", "CONVERTED")).toBe(true);
      });

      it("should allow ACTIVE -> LOST", () => {
        expect(isValidClientTransition("ACTIVE", "LOST")).toBe(true);
      });

      it("should not allow ACTIVE -> LEAD", () => {
        expect(isValidClientTransition("ACTIVE", "LEAD")).toBe(false);
      });
    });

    describe("INACTIVE transitions", () => {
      it("should allow INACTIVE -> ACTIVE", () => {
        expect(isValidClientTransition("INACTIVE", "ACTIVE")).toBe(true);
      });

      it("should allow INACTIVE -> LOST", () => {
        expect(isValidClientTransition("INACTIVE", "LOST")).toBe(true);
      });

      it("should not allow INACTIVE -> CONVERTED", () => {
        expect(isValidClientTransition("INACTIVE", "CONVERTED")).toBe(false);
      });
    });

    describe("CONVERTED transitions (terminal)", () => {
      it("should not allow CONVERTED -> any status", () => {
        expect(isValidClientTransition("CONVERTED", "ACTIVE")).toBe(false);
        expect(isValidClientTransition("CONVERTED", "LEAD")).toBe(false);
        expect(isValidClientTransition("CONVERTED", "INACTIVE")).toBe(false);
        expect(isValidClientTransition("CONVERTED", "LOST")).toBe(false);
      });

      it("should return empty array for valid next statuses", () => {
        expect(getValidClientNextStatuses("CONVERTED")).toHaveLength(0);
      });
    });

    describe("LOST transitions (re-engagement allowed)", () => {
      it("should allow LOST -> LEAD (re-engage)", () => {
        expect(isValidClientTransition("LOST", "LEAD")).toBe(true);
      });

      it("should allow LOST -> ACTIVE (re-engage)", () => {
        expect(isValidClientTransition("LOST", "ACTIVE")).toBe(true);
      });
    });

    describe("Error messages", () => {
      it("should return meaningful error for invalid transition", () => {
        const error = getClientTransitionError("LEAD", "CONVERTED");
        expect(error).toContain("LEAD");
        expect(error).toContain("CONVERTED");
        expect(error).toContain("Valid transitions");
      });

      it("should return terminal state message for CONVERTED", () => {
        const error = getClientTransitionError("CONVERTED", "ACTIVE");
        expect(error).toContain("terminal state");
      });
    });

    describe("Same status (no change)", () => {
      it("should allow staying in same status", () => {
        expect(isValidClientTransition("ACTIVE", "ACTIVE")).toBe(true);
        expect(isValidClientTransition("LEAD", "LEAD")).toBe(true);
      });
    });
  });

  describe("MLS-004: Property Status Transitions", () => {
    describe("ACTIVE transitions", () => {
      it("should allow ACTIVE -> PENDING", () => {
        expect(isValidPropertyTransition("ACTIVE", "PENDING")).toBe(true);
      });

      it("should allow ACTIVE -> WITHDRAWN", () => {
        expect(isValidPropertyTransition("ACTIVE", "WITHDRAWN")).toBe(true);
      });

      it("should allow ACTIVE -> OFF_MARKET", () => {
        expect(isValidPropertyTransition("ACTIVE", "OFF_MARKET")).toBe(true);
      });

      it("should not allow ACTIVE -> SOLD directly", () => {
        expect(isValidPropertyTransition("ACTIVE", "SOLD")).toBe(false);
      });
    });

    describe("PENDING transitions", () => {
      it("should allow PENDING -> ACTIVE (back to market)", () => {
        expect(isValidPropertyTransition("PENDING", "ACTIVE")).toBe(true);
      });

      it("should allow PENDING -> SOLD", () => {
        expect(isValidPropertyTransition("PENDING", "SOLD")).toBe(true);
      });

      it("should allow PENDING -> WITHDRAWN", () => {
        expect(isValidPropertyTransition("PENDING", "WITHDRAWN")).toBe(true);
      });
    });

    describe("SOLD transitions", () => {
      it("should allow SOLD -> OFF_MARKET (archive)", () => {
        expect(isValidPropertyTransition("SOLD", "OFF_MARKET")).toBe(true);
      });

      it("should not allow SOLD -> ACTIVE (cannot unsell)", () => {
        expect(isValidPropertyTransition("SOLD", "ACTIVE")).toBe(false);
      });

      it("should not allow SOLD -> PENDING", () => {
        expect(isValidPropertyTransition("SOLD", "PENDING")).toBe(false);
      });
    });

    describe("WITHDRAWN transitions", () => {
      it("should allow WITHDRAWN -> ACTIVE (re-list)", () => {
        expect(isValidPropertyTransition("WITHDRAWN", "ACTIVE")).toBe(true);
      });

      it("should allow WITHDRAWN -> OFF_MARKET", () => {
        expect(isValidPropertyTransition("WITHDRAWN", "OFF_MARKET")).toBe(true);
      });
    });

    describe("OFF_MARKET transitions", () => {
      it("should allow OFF_MARKET -> ACTIVE (re-list)", () => {
        expect(isValidPropertyTransition("OFF_MARKET", "ACTIVE")).toBe(true);
      });
    });
  });

  describe("DEAL-002: Deal Status Transitions", () => {
    describe("PROPOSED transitions", () => {
      it("should allow PROPOSED -> NEGOTIATING", () => {
        expect(isValidDealTransition("PROPOSED", "NEGOTIATING")).toBe(true);
      });

      it("should allow PROPOSED -> ACCEPTED", () => {
        expect(isValidDealTransition("PROPOSED", "ACCEPTED")).toBe(true);
      });

      it("should allow PROPOSED -> CANCELLED", () => {
        expect(isValidDealTransition("PROPOSED", "CANCELLED")).toBe(true);
      });

      it("should not allow PROPOSED -> COMPLETED directly", () => {
        expect(isValidDealTransition("PROPOSED", "COMPLETED")).toBe(false);
      });

      it("should not allow PROPOSED -> IN_PROGRESS directly", () => {
        expect(isValidDealTransition("PROPOSED", "IN_PROGRESS")).toBe(false);
      });
    });

    describe("NEGOTIATING transitions", () => {
      it("should allow NEGOTIATING -> ACCEPTED", () => {
        expect(isValidDealTransition("NEGOTIATING", "ACCEPTED")).toBe(true);
      });

      it("should allow NEGOTIATING -> CANCELLED", () => {
        expect(isValidDealTransition("NEGOTIATING", "CANCELLED")).toBe(true);
      });

      it("should not allow NEGOTIATING -> PROPOSED (no going back)", () => {
        expect(isValidDealTransition("NEGOTIATING", "PROPOSED")).toBe(false);
      });
    });

    describe("ACCEPTED transitions", () => {
      it("should allow ACCEPTED -> IN_PROGRESS", () => {
        expect(isValidDealTransition("ACCEPTED", "IN_PROGRESS")).toBe(true);
      });

      it("should allow ACCEPTED -> CANCELLED", () => {
        expect(isValidDealTransition("ACCEPTED", "CANCELLED")).toBe(true);
      });

      it("should not allow ACCEPTED -> COMPLETED directly", () => {
        expect(isValidDealTransition("ACCEPTED", "COMPLETED")).toBe(false);
      });
    });

    describe("IN_PROGRESS transitions", () => {
      it("should allow IN_PROGRESS -> COMPLETED", () => {
        expect(isValidDealTransition("IN_PROGRESS", "COMPLETED")).toBe(true);
      });

      it("should allow IN_PROGRESS -> CANCELLED", () => {
        expect(isValidDealTransition("IN_PROGRESS", "CANCELLED")).toBe(true);
      });
    });

    describe("Terminal states", () => {
      it("should not allow COMPLETED -> any status", () => {
        expect(isValidDealTransition("COMPLETED", "PROPOSED")).toBe(false);
        expect(isValidDealTransition("COMPLETED", "CANCELLED")).toBe(false);
        expect(isValidDealTransition("COMPLETED", "IN_PROGRESS")).toBe(false);
      });

      it("should not allow CANCELLED -> any status", () => {
        expect(isValidDealTransition("CANCELLED", "PROPOSED")).toBe(false);
        expect(isValidDealTransition("CANCELLED", "COMPLETED")).toBe(false);
      });

      it("should return empty arrays for terminal states", () => {
        expect(getValidDealNextStatuses("COMPLETED")).toHaveLength(0);
        expect(getValidDealNextStatuses("CANCELLED")).toHaveLength(0);
      });
    });
  });

  describe("Generic validateStatusTransition", () => {
    it("should validate client transitions correctly", () => {
      const result = validateStatusTransition("client", "LEAD", "ACTIVE");
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should return error for invalid client transition", () => {
      const result = validateStatusTransition("client", "LEAD", "CONVERTED");
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should validate property transitions correctly", () => {
      const result = validateStatusTransition("property", "ACTIVE", "PENDING");
      expect(result.valid).toBe(true);
    });

    it("should validate deal transitions correctly", () => {
      const result = validateStatusTransition("deal", "PROPOSED", "ACCEPTED");
      expect(result.valid).toBe(true);
    });

    it("should return valid next statuses", () => {
      const result = validateStatusTransition("client", "LEAD", "CONVERTED");
      expect(result.validNextStatuses).toContain("ACTIVE");
      expect(result.validNextStatuses).toContain("LOST");
    });
  });

  describe("Transition maps are complete", () => {
    it("should have all client statuses in transition map", () => {
      const statuses = ["LEAD", "ACTIVE", "INACTIVE", "CONVERTED", "LOST"];
      statuses.forEach(status => {
        expect(CLIENT_STATUS_TRANSITIONS).toHaveProperty(status);
      });
    });

    it("should have all property statuses in transition map", () => {
      const statuses = ["ACTIVE", "PENDING", "SOLD", "OFF_MARKET", "WITHDRAWN"];
      statuses.forEach(status => {
        expect(PROPERTY_STATUS_TRANSITIONS).toHaveProperty(status);
      });
    });

    it("should have all deal statuses in transition map", () => {
      const statuses = ["PROPOSED", "NEGOTIATING", "ACCEPTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
      statuses.forEach(status => {
        expect(DEAL_STATUS_TRANSITIONS).toHaveProperty(status);
      });
    });
  });
});
