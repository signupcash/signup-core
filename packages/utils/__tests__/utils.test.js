"use strict";

const { verify } = require("../lib/utils");

const mockPayloadInJSON =
  '{"signedBy":"Signup.cash","requestedBy":"localhost:5000","data":{"message":"Testing verify() fn for Signup.cash utils"},"timestamp":1601555811427}';
const mockPayloadInObject = JSON.parse(mockPayloadInJSON);
const mockBchAddr = "bitcoincash:qpgan8qtp0s6vny6mg6ja7zs8599tdfg9yvrk89qm6";
const mockSignature =
  "IGid4hb8JNwmpvHtgFuR8riP5y+FRq3BV1+2fprknEPAfJ2DszXa+7gYTkgZjuwf0i7NA9FEfSERS4sDAIy0nFM=";
const wrongSignature =
  "INmSM+yycDpu03E0AppgQMNZnHn8wUX2D2HbYTLxqogoWXXH/M2Od1JMHrqxoeObADfV/kD0mXEwbdF/pbSsixY=";

describe("Verify()", () => {
  test("should throw an error for invlaid inputs", () => {
    expect(() => {
      verify(undefined, null, null);
    }).toThrowErrorMatchingSnapshot();

    expect(() => {
      verify({});
    }).toThrowErrorMatchingSnapshot();

    expect(() => {
      verify({}, mockBchAddr);
    }).toThrowErrorMatchingSnapshot();

    expect(() => {
      verify({}, "bitcoincash:invalid_bch_address", mockSignature);
    }).toThrowErrorMatchingSnapshot();
  });

  test("should verify the signature with a JSON payload correctly", () => {
    expect(verify(mockPayloadInObject, mockBchAddr, mockSignature)).toBe(true);
  });

  test("should verify the signature with a Object payload correctly", () => {
    expect(verify(mockPayloadInObject, mockBchAddr, mockSignature)).toBe(true);
  });

  test("should fail to verify if the signature is wrong", () => {
    expect(verify(mockPayloadInObject, mockBchAddr, wrongSignature)).toBe(
      false
    );
  });
});
