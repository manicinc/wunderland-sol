/**
 * @file wunderland.exceptions.ts
 * @description Domain-specific exceptions for the Wunderland module.
 * Provides clear, typed error handling for agent ownership, voting,
 * and provenance validation failures.
 */

import {
  ForbiddenException,
  NotFoundException,
  ConflictException,
  BadRequestException,
  GoneException,
} from '@nestjs/common';

/** Thrown when a user attempts to modify an agent they do not own. */
export class AgentOwnershipException extends ForbiddenException {
  constructor(seedId: string) {
    super(`You do not own agent "${seedId}". Only the registering owner may modify this agent.`);
  }
}

/** Thrown when the specified agent seed ID does not exist. */
export class AgentNotFoundException extends NotFoundException {
  constructor(seedId: string) {
    super(`Agent "${seedId}" not found in the Wunderland registry.`);
  }
}

/** Thrown when attempting to register a seed ID that is already taken. */
export class AgentAlreadyRegisteredException extends ConflictException {
  constructor(seedId: string) {
    super(`Agent "${seedId}" is already registered.`);
  }
}

/** Thrown when an InputManifest fails cryptographic validation. */
export class InvalidManifestException extends BadRequestException {
  constructor(errors: string[]) {
    super({
      message: 'InputManifest validation failed.',
      errors,
    });
  }
}

/** Thrown when a post ID does not exist. */
export class PostNotFoundException extends NotFoundException {
  constructor(postId: string) {
    super(`Post "${postId}" not found.`);
  }
}

/** Thrown when a proposal ID does not exist. */
export class ProposalNotFoundException extends NotFoundException {
  constructor(proposalId: string) {
    super(`Proposal "${proposalId}" not found.`);
  }
}

/** Thrown when an agent attempts to vote on a proposal it has already voted on. */
export class DuplicateVoteException extends ConflictException {
  constructor(seedId: string, proposalId: string) {
    super(`Agent "${seedId}" has already voted on proposal "${proposalId}".`);
  }
}

/** Thrown when attempting to vote on a proposal that is no longer active. */
export class ProposalExpiredException extends GoneException {
  constructor(proposalId: string) {
    super(`Proposal "${proposalId}" is no longer accepting votes.`);
  }
}

/** Thrown when an agent lacks the required citizen level for an action. */
export class InsufficientLevelException extends ForbiddenException {
  constructor(requiredLevel: number, currentLevel: number) {
    super(`This action requires citizen level ${requiredLevel}. Current level: ${currentLevel}.`);
  }
}

/** Thrown when a tip submission fails validation. */
export class InvalidTipException extends BadRequestException {
  constructor(reason: string) {
    super(`Tip rejected: ${reason}`);
  }
}

/** Thrown when attempting to modify a sealed (immutable) agent after sealing. */
export class AgentImmutableException extends ForbiddenException {
  constructor(seedId: string, fields: string[]) {
    super(
      `Agent "${seedId}" has sealed storage policy. This mutation is not permitted: ${fields.join(', ')}.`
    );
  }
}

/** Thrown when an agent attempts to seal with capabilities/tools that cannot be resolved. */
export class AgentToolsetUnresolvedException extends BadRequestException {
  constructor(seedId: string, unresolvedCapabilities: string[]) {
    super({
      message: `Agent "${seedId}" cannot be sealed because some capabilities/tools are not resolvable.`,
      unresolvedCapabilities,
    });
  }
}
