// edu-nft.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";

// Interfaces for type safety
interface ClarityResponse<T> {
  ok: boolean;
  value: T | number; // number for error codes
}

interface NFTDetails {
  creator: string;
  current_owner: string;
  content_hash: Uint8Array;
  title: string;
  description: string;
  mint_timestamp: number;
}

interface VersionDetails {
  updated_hash: Uint8Array;
  update_notes: string;
  timestamp: number;
}

interface LicenseDetails {
  expiry: number;
  terms: string;
  active: boolean;
  granted_by: string;
  grant_timestamp: number;
}

interface CategoryDetails {
  category: string;
  tags: string[];
}

interface CollaboratorDetails {
  role: string;
  permissions: string[];
  added_at: number;
  added_by: string;
}

interface StatusDetails {
  status: string;
  visibility: boolean;
  last_updated: number;
  updated_by: string;
}

interface RevenueShareDetails {
  percentage: number;
  total_received: number;
  set_by: string;
}

interface ContractState {
  paused: boolean;
  admin: string;
  tokenIdNonce: number;
  contentRegistry: Map<number, NFTDetails>;
  versionRegistry: Map<string, VersionDetails>; // Key: `${tokenId}-${version}`
  licenses: Map<string, LicenseDetails>; // Key: `${tokenId}-${licensee}`
  workCategories: Map<number, CategoryDetails>;
  collaborators: Map<string, CollaboratorDetails>; // Key: `${tokenId}-${collaborator}`
  workStatus: Map<number, StatusDetails>;
  revenueShares: Map<string, RevenueShareDetails>; // Key: `${tokenId}-${participant}`
  nftOwners: Map<number, string>; // Simulate NFT ownership
}

// Mock contract implementation
class EduNFTMock {
  private state: ContractState = {
    paused: false,
    admin: "deployer",
    tokenIdNonce: 0,
    contentRegistry: new Map(),
    versionRegistry: new Map(),
    licenses: new Map(),
    workCategories: new Map(),
    collaborators: new Map(),
    workStatus: new Map(),
    revenueShares: new Map(),
    nftOwners: new Map(),
  };

  private MAX_METADATA_LEN = 1024;
  private MAX_TAGS = 10;
  private MAX_PERMISSIONS = 5;
  private MAX_VERSIONS = 100;
  private ERR_UNAUTHORIZED = 100;
  private ERR_ALREADY_EXISTS = 101;
  private ERR_NOT_FOUND = 102;
  private ERR_INVALID_PARAM = 103;
  private ERR_PAUSED = 104;
  private ERR_METADATA_TOO_LONG = 105;
  private ERR_INVALID_SHARE = 106;

  // Simulate block height for timestamps
  private currentBlockHeight = 1000;

  private incrementBlockHeight() {
    this.currentBlockHeight += 1;
  }

  mintNft(caller: string, contentHash: Uint8Array, title: string, description: string): ClarityResponse<number> {
    if (this.state.paused) {
      return { ok: false, value: this.ERR_PAUSED };
    }
    if (description.length > this.MAX_METADATA_LEN) {
      return { ok: false, value: this.ERR_METADATA_TOO_LONG };
    }
    const newId = this.state.tokenIdNonce + 1;
    this.state.nftOwners.set(newId, caller);
    this.state.contentRegistry.set(newId, {
      creator: caller,
      current_owner: caller,
      content_hash: contentHash,
      title,
      description,
      mint_timestamp: this.currentBlockHeight,
    });
    this.state.tokenIdNonce = newId;
    this.incrementBlockHeight();
    return { ok: true, value: newId };
  }

  transferOwnership(caller: string, tokenId: number, newOwner: string): ClarityResponse<boolean> {
    const registry = this.state.contentRegistry.get(tokenId);
    if (!registry) {
      return { ok: false, value: this.ERR_NOT_FOUND };
    }
    if (registry.current_owner !== caller) {
      return { ok: false, value: this.ERR_UNAUTHORIZED };
    }
    registry.current_owner = newOwner;
    this.state.nftOwners.set(tokenId, newOwner);
    this.state.contentRegistry.set(tokenId, registry);
    this.incrementBlockHeight();
    return { ok: true, value: true };
  }

  registerNewVersion(caller: string, tokenId: number, newHash: Uint8Array, version: number, notes: string): ClarityResponse<boolean> {
    const registry = this.state.contentRegistry.get(tokenId);
    if (!registry) {
      return { ok: false, value: this.ERR_NOT_FOUND };
    }
    if (registry.current_owner !== caller) {
      return { ok: false, value: this.ERR_UNAUTHORIZED };
    }
    if (version >= this.MAX_VERSIONS) {
      return { ok: false, value: this.ERR_INVALID_PARAM };
    }
    const key = `${tokenId}-${version}`;
    this.state.versionRegistry.set(key, {
      updated_hash: newHash,
      update_notes: notes,
      timestamp: this.currentBlockHeight,
    });
    this.incrementBlockHeight();
    return { ok: true, value: true };
  }

  grantLicense(caller: string, tokenId: number, licensee: string, duration: number, terms: string): ClarityResponse<boolean> {
    const registry = this.state.contentRegistry.get(tokenId);
    if (!registry) {
      return { ok: false, value: this.ERR_NOT_FOUND };
    }
    if (registry.current_owner !== caller) {
      return { ok: false, value: this.ERR_UNAUTHORIZED };
    }
    if (duration <= 0) {
      return { ok: false, value: this.ERR_INVALID_PARAM };
    }
    const key = `${tokenId}-${licensee}`;
    this.state.licenses.set(key, {
      expiry: this.currentBlockHeight + duration,
      terms,
      active: true,
      granted_by: caller,
      grant_timestamp: this.currentBlockHeight,
    });
    this.incrementBlockHeight();
    return { ok: true, value: true };
  }

  revokeLicense(caller: string, tokenId: number, licensee: string): ClarityResponse<boolean> {
    const registry = this.state.contentRegistry.get(tokenId);
    if (!registry) {
      return { ok: false, value: this.ERR_NOT_FOUND };
    }
    if (registry.current_owner !== caller) {
      return { ok: false, value: this.ERR_UNAUTHORIZED };
    }
    const key = `${tokenId}-${licensee}`;
    const license = this.state.licenses.get(key);
    if (!license) {
      return { ok: false, value: this.ERR_NOT_FOUND };
    }
    license.active = false;
    this.state.licenses.set(key, license);
    this.incrementBlockHeight();
    return { ok: true, value: true };
  }

  setCategories(caller: string, tokenId: number, category: string, tags: string[]): ClarityResponse<boolean> {
    const registry = this.state.contentRegistry.get(tokenId);
    if (!registry) {
      return { ok: false, value: this.ERR_NOT_FOUND };
    }
    if (registry.current_owner !== caller) {
      return { ok: false, value: this.ERR_UNAUTHORIZED };
    }
    if (tags.length > this.MAX_TAGS) {
      return { ok: false, value: this.ERR_INVALID_PARAM };
    }
    this.state.workCategories.set(tokenId, { category, tags });
    this.incrementBlockHeight();
    return { ok: true, value: true };
  }

  addCollaborator(caller: string, tokenId: number, collaborator: string, role: string, permissions: string[]): ClarityResponse<boolean> {
    const registry = this.state.contentRegistry.get(tokenId);
    if (!registry) {
      return { ok: false, value: this.ERR_NOT_FOUND };
    }
    if (registry.current_owner !== caller) {
      return { ok: false, value: this.ERR_UNAUTHORIZED };
    }
    if (permissions.length > this.MAX_PERMISSIONS) {
      return { ok: false, value: this.ERR_INVALID_PARAM };
    }
    const key = `${tokenId}-${collaborator}`;
    if (this.state.collaborators.has(key)) {
      return { ok: false, value: this.ERR_ALREADY_EXISTS };
    }
    this.state.collaborators.set(key, {
      role,
      permissions,
      added_at: this.currentBlockHeight,
      added_by: caller,
    });
    this.incrementBlockHeight();
    return { ok: true, value: true };
  }

  removeCollaborator(caller: string, tokenId: number, collaborator: string): ClarityResponse<boolean> {
    const registry = this.state.contentRegistry.get(tokenId);
    if (!registry) {
      return { ok: false, value: this.ERR_NOT_FOUND };
    }
    if (registry.current_owner !== caller) {
      return { ok: false, value: this.ERR_UNAUTHORIZED };
    }
    const key = `${tokenId}-${collaborator}`;
    this.state.collaborators.delete(key);
    this.incrementBlockHeight();
    return { ok: true, value: true };
  }

  updateStatus(caller: string, tokenId: number, status: string, visibility: boolean): ClarityResponse<boolean> {
    const registry = this.state.contentRegistry.get(tokenId);
    if (!registry) {
      return { ok: false, value: this.ERR_NOT_FOUND };
    }
    if (registry.current_owner !== caller) {
      return { ok: false, value: this.ERR_UNAUTHORIZED };
    }
    this.state.workStatus.set(tokenId, {
      status,
      visibility,
      last_updated: this.currentBlockHeight,
      updated_by: caller,
    });
    this.incrementBlockHeight();
    return { ok: true, value: true };
  }

  setRevenueShare(caller: string, tokenId: number, participant: string, percentage: number): ClarityResponse<boolean> {
    const registry = this.state.contentRegistry.get(tokenId);
    if (!registry) {
      return { ok: false, value: this.ERR_NOT_FOUND };
    }
    if (registry.current_owner !== caller) {
      return { ok: false, value: this.ERR_UNAUTHORIZED };
    }
    if (percentage <= 0 || percentage > 100) {
      return { ok: false, value: this.ERR_INVALID_SHARE };
    }
    const key = `${tokenId}-${participant}`;
    this.state.revenueShares.set(key, {
      percentage,
      total_received: 0,
      set_by: caller,
    });
    this.incrementBlockHeight();
    return { ok: true, value: true };
  }

  pauseContract(caller: string): ClarityResponse<boolean> {
    if (caller !== this.state.admin) {
      return { ok: false, value: this.ERR_UNAUTHORIZED };
    }
    this.state.paused = true;
    return { ok: true, value: true };
  }

  unpauseContract(caller: string): ClarityResponse<boolean> {
    if (caller !== this.state.admin) {
      return { ok: false, value: this.ERR_UNAUTHORIZED };
    }
    this.state.paused = false;
    return { ok: true, value: true };
  }

  transferAdmin(caller: string, newAdmin: string): ClarityResponse<boolean> {
    if (caller !== this.state.admin) {
      return { ok: false, value: this.ERR_UNAUTHORIZED };
    }
    this.state.admin = newAdmin;
    return { ok: true, value: true };
  }

  getNftDetails(tokenId: number): ClarityResponse<NFTDetails | undefined> {
    return { ok: true, value: this.state.contentRegistry.get(tokenId) };
  }

  getVersionDetails(tokenId: number, version: number): ClarityResponse<VersionDetails | undefined> {
    const key = `${tokenId}-${version}`;
    return { ok: true, value: this.state.versionRegistry.get(key) };
  }

  getLicenseDetails(tokenId: number, licensee: string): ClarityResponse<LicenseDetails | undefined> {
    const key = `${tokenId}-${licensee}`;
    return { ok: true, value: this.state.licenses.get(key) };
  }

  getCategories(tokenId: number): ClarityResponse<CategoryDetails | undefined> {
    return { ok: true, value: this.state.workCategories.get(tokenId) };
  }

  getCollaboratorDetails(tokenId: number, collaborator: string): ClarityResponse<CollaboratorDetails | undefined> {
    const key = `${tokenId}-${collaborator}`;
    return { ok: true, value: this.state.collaborators.get(key) };
  }

  getStatus(tokenId: number): ClarityResponse<StatusDetails | undefined> {
    return { ok: true, value: this.state.workStatus.get(tokenId) };
  }

  getRevenueShare(tokenId: number, participant: string): ClarityResponse<RevenueShareDetails | undefined> {
    const key = `${tokenId}-${participant}`;
    return { ok: true, value: this.state.revenueShares.get(key) };
  }

  getOwner(tokenId: number): ClarityResponse<string | undefined> {
    return { ok: true, value: this.state.nftOwners.get(tokenId) };
  }

  getLastTokenId(): ClarityResponse<number> {
    return { ok: true, value: this.state.tokenIdNonce };
  }

  isPaused(): ClarityResponse<boolean> {
    return { ok: true, value: this.state.paused };
  }

  getAdmin(): ClarityResponse<string> {
    return { ok: true, value: this.state.admin };
  }
}

// Test setup
const accounts = {
  deployer: "deployer",
  creator: "wallet_1",
  user1: "wallet_2",
  user2: "wallet_3",
  collaborator: "wallet_4",
};

const mockHash = new Uint8Array([1, 2, 3]); // Mock buff 32

describe("EduNFT Contract", () => {
  let contract: EduNFTMock;

  beforeEach(() => {
    contract = new EduNFTMock();
    vi.resetAllMocks();
  });

  it("should mint a new NFT with valid metadata", () => {
    const mintResult = contract.mintNft(accounts.creator, mockHash, "Math Course", "Intro to Algebra");
    expect(mintResult.ok).toBe(true);
    expect(mintResult.value).toBe(1);

    const details = contract.getNftDetails(1);
    expect(details.ok).toBe(true);
    expect(details.value).toEqual(expect.objectContaining({
      creator: accounts.creator,
      current_owner: accounts.creator,
      title: "Math Course",
      description: "Intro to Algebra",
    }));
  });

  it("should prevent minting when paused", () => {
    contract.pauseContract(accounts.deployer);
    const mintResult = contract.mintNft(accounts.creator, mockHash, "Math Course", "Intro to Algebra");
    expect(mintResult.ok).toBe(false);
    expect(mintResult.value).toBe(104);
  });

  it("should prevent minting with too long description", () => {
    const longDesc = "a".repeat(1025);
    const mintResult = contract.mintNft(accounts.creator, mockHash, "Math Course", longDesc);
    expect(mintResult.ok).toBe(false);
    expect(mintResult.value).toBe(105);
  });

  it("should transfer ownership to a new user", () => {
    contract.mintNft(accounts.creator, mockHash, "Math Course", "Intro to Algebra");
    const transferResult = contract.transferOwnership(accounts.creator, 1, accounts.user1);
    expect(transferResult.ok).toBe(true);

    const owner = contract.getOwner(1);
    expect(owner.value).toBe(accounts.user1);
  });

  it("should prevent unauthorized ownership transfer", () => {
    contract.mintNft(accounts.creator, mockHash, "Math Course", "Intro to Algebra");
    const transferResult = contract.transferOwnership(accounts.user1, 1, accounts.user2);
    expect(transferResult.ok).toBe(false);
    expect(transferResult.value).toBe(100);
  });

  it("should register a new version", () => {
    contract.mintNft(accounts.creator, mockHash, "Math Course", "Intro to Algebra");
    const versionResult = contract.registerNewVersion(accounts.creator, 1, mockHash, 2, "Updated examples");
    expect(versionResult.ok).toBe(true);

    const versionDetails = contract.getVersionDetails(1, 2);
    expect(versionDetails.value).toEqual(expect.objectContaining({ update_notes: "Updated examples" }));
  });

  it("should prevent version registration beyond max", () => {
    contract.mintNft(accounts.creator, mockHash, "Math Course", "Intro to Algebra");
    const versionResult = contract.registerNewVersion(accounts.creator, 1, mockHash, 100, "Too high");
    expect(versionResult.ok).toBe(false);
    expect(versionResult.value).toBe(103);
  });

  it("should grant and revoke a license", () => {
    contract.mintNft(accounts.creator, mockHash, "Math Course", "Intro to Algebra");
    const grantResult = contract.grantLicense(accounts.creator, 1, accounts.user1, 100, "Educational use only");
    expect(grantResult.ok).toBe(true);

    let license = contract.getLicenseDetails(1, accounts.user1);
    expect(license.value?.active).toBe(true);

    const revokeResult = contract.revokeLicense(accounts.creator, 1, accounts.user1);
    expect(revokeResult.ok).toBe(true);

    license = contract.getLicenseDetails(1, accounts.user1);
    expect(license.value?.active).toBe(false);
  });

  it("should set categories and tags", () => {
    contract.mintNft(accounts.creator, mockHash, "Math Course", "Intro to Algebra");
    const setResult = contract.setCategories(accounts.creator, 1, "Mathematics", ["algebra", "beginner"]);
    expect(setResult.ok).toBe(true);

    const categories = contract.getCategories(1);
    expect(categories.value).toEqual({ category: "Mathematics", tags: ["algebra", "beginner"] });
  });

  it("should add and remove collaborator", () => {
    contract.mintNft(accounts.creator, mockHash, "Math Course", "Intro to Algebra");
    const addResult = contract.addCollaborator(accounts.creator, 1, accounts.collaborator, "Editor", ["update"]);
    expect(addResult.ok).toBe(true);

    let collab = contract.getCollaboratorDetails(1, accounts.collaborator);
    expect(collab.value?.role).toBe("Editor");

    const removeResult = contract.removeCollaborator(accounts.creator, 1, accounts.collaborator);
    expect(removeResult.ok).toBe(true);

    collab = contract.getCollaboratorDetails(1, accounts.collaborator);
    expect(collab.value).toBeUndefined();
  });

  it("should update status", () => {
    contract.mintNft(accounts.creator, mockHash, "Math Course", "Intro to Algebra");
    const updateResult = contract.updateStatus(accounts.creator, 1, "Published", true);
    expect(updateResult.ok).toBe(true);

    const status = contract.getStatus(1);
    expect(status.value).toEqual(expect.objectContaining({ status: "Published", visibility: true }));
  });

  it("should set revenue share", () => {
    contract.mintNft(accounts.creator, mockHash, "Math Course", "Intro to Algebra");
    const setResult = contract.setRevenueShare(accounts.creator, 1, accounts.user1, 20);
    expect(setResult.ok).toBe(true);

    const share = contract.getRevenueShare(1, accounts.user1);
    expect(share.value?.percentage).toBe(20);
  });

  it("should prevent invalid revenue share", () => {
    contract.mintNft(accounts.creator, mockHash, "Math Course", "Intro to Algebra");
    const setResult = contract.setRevenueShare(accounts.creator, 1, accounts.user1, 101);
    expect(setResult.ok).toBe(false);
    expect(setResult.value).toBe(106);
  });

  it("should pause and unpause contract by admin", () => {
    const pauseResult = contract.pauseContract(accounts.deployer);
    expect(pauseResult.ok).toBe(true);
    expect(contract.isPaused().value).toBe(true);

    const unpauseResult = contract.unpauseContract(accounts.deployer);
    expect(unpauseResult.ok).toBe(true);
    expect(contract.isPaused().value).toBe(false);
  });

  it("should transfer admin role", () => {
    const transferResult = contract.transferAdmin(accounts.deployer, accounts.user1);
    expect(transferResult.ok).toBe(true);
    expect(contract.getAdmin().value).toBe(accounts.user1);
  });
});