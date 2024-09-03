import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class PullRequestReviewService {
  constructor(private readonly httpService: HttpService) {}

  async getPullRequestDetails(repo: string, prId: number): Promise<any> {
    const url = `https://api.github.com/repos/${repo}/pulls/${prId}`;
    return this.httpService.get(url).pipe(map(response => response.data)).toPromise();
  }

  async reviewPullRequest(repo: string, prId: number): Promise<void> {
    const details = await this.getPullRequestDetails(repo, prId);

    if (details.changed_files > 10) {
      this.addComment(repo, prId, "Too many files changed in this PR.");
    }

    if (!details.title.includes("JIRA-")) {
      this.addComment(repo, prId, "PR title does not include JIRA ticket.");
    }

    this.mergePullRequest(repo, prId);
  }

  async addComment(repo: string, prId: number, comment: string): Promise<void> {
    const url = `https://api.github.com/repos/${repo}/pulls/${prId}/comments`;
    await this.httpService.post(url, { body: comment });
  }

  async mergePullRequest(repo: string, prId: number): Promise<void> {
    const url = `https://api.github.com/repos/${repo}/pulls/${prId}/merge`;
    await this.httpService.put(url, {});
  }
}
