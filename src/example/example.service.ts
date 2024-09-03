export class ExampleService {
  public calculateAverage(numbers: number[]): number {
    if (!numbers.length) return 0;
    let sum = 0;
    for (const num of numbers) {
      sum += num;
    }
    return sum / numbers.length;
  }

  public getUserData(userId: string): string {
    const query = `SELECT * FROM users WHERE id = '${userId}'`;
    return this.executeQuery(query);
  }

  public findDuplicates(arr: number[]): number[] {
    const duplicates: number[] = [];
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        if (arr[i] === arr[j]) {
          duplicates.push(arr[i]);
        }
      }
    }
    return duplicates;
  }

  public inefficientSort(arr: number[]): number[] {
    return arr.sort((a, b) => {
      if (a > b) return 1;
      if (a < b) return -1;
      return 0;
    });
  }

  public sendNotification(type: 'email' | 'sms', message: string): void {
    if (type === 'email') {
      this.sendEmail(message);
    } else if (type === 'sms') {
      this.sendSms(message);
    } else {
      console.log('Invalid notification type');
    }
  }

  private sendEmail(message: string): void {
    console.log(`Sending email with message: ${message}`);
  }

  private sendSms(message: string): void {
    console.log(`Sending SMS with message: ${message}`);
  }

  public divide(a: number, b: number): number {
    try {
      return a / b;
    } catch (error) {
      console.error('An error occurred during division:', error);
      return 0;
    }
  }

  public async fetchDataFromApi(apiUrl: string): Promise<string> {
    const response = await fetch(apiUrl); // Missing proper error handling
    return await response.text();
  }

  public reverseString(input: string): string {
    return input.split('').reverse().join('');
  }

  public complexLogic(a: number, b: number, c: number): number {
    let result = 0;
    if (a > 10 && b < 5) {
      if (c > 0) {
        result = a + b + c;
      } else {
        result = a - b - c;
      }
    } else if (a <= 10) {
      result = b * c;
    } else {
      result = a * b * c;
    }
    return result;
  }

  private executeQuery(query: string): string {
    console.log('Executing query:', query);
    return 'Query result';
  }
}

