declare module '@aws-sdk/client-s3' {
  export interface S3ClientConfig {
    region?: string;
    endpoint?: string;
    forcePathStyle?: boolean;
    credentials?: unknown;
  }

  export class S3Client {
    constructor(config?: S3ClientConfig);
    send<T = unknown>(command: unknown): Promise<T>;
  }

  export class PutObjectCommand {
    constructor(input: Record<string, unknown>);
  }

  export class GetObjectCommand {
    constructor(input: Record<string, unknown>);
  }

  export class ListObjectsV2Command {
    constructor(input: Record<string, unknown>);
  }

  export class DeleteObjectCommand {
    constructor(input: Record<string, unknown>);
  }
}
